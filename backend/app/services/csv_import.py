import csv
import io
from typing import List, Dict, Any
from sqlmodel import Session, select
from datetime import datetime

from app.models import Bag, Script, ScriptType, BagCreate, ScriptCreate
from app.services.phrase_mapper import apply_phrase_map_to_script_content


class CSVImportError(Exception):
    pass


def validate_template_a_headers(headers: List[str]) -> bool:
    """Validate Template A CSV headers: bag_id,script_text"""
    required_headers = ["bag_id", "script_text"]
    return all(header.strip().lower() in [h.lower() for h in headers] for header in required_headers)


def validate_template_b_headers(headers: List[str]) -> bool:
    """Validate Template B CSV headers: bag_id,brand,model,color,condition,hook_text,look_text,story_text,value_text,cta_text"""
    required_headers = [
        "bag_id", "brand", "model", "color", "condition",
        "hook_text", "look_text", "story_text", "value_text", "cta_text"
    ]
    return all(header.strip().lower() in [h.lower() for h in headers] for header in required_headers)


def process_template_a_csv(
    csv_content: str, 
    account_id: int, 
    session: Session
) -> Dict[str, Any]:
    """
    Process Template A CSV: bag_id,script_text
    Adds scripts to existing bags.
    """
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    headers = [h.strip() for h in csv_reader.fieldnames] if csv_reader.fieldnames else []
    
    if not validate_template_a_headers(headers):
        raise CSVImportError("Invalid Template A headers. Expected: bag_id,script_text")
    
    processed_rows = 0
    errors = []
    warnings = []
    created_scripts = []
    
    for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 for header row
        try:
            bag_id = int(row["bag_id"].strip())
            script_text = row["script_text"].strip()
            
            if not script_text:
                errors.append(f"Row {row_num}: script_text cannot be empty")
                continue
            
            # Verify bag exists and belongs to account
            bag_statement = select(Bag).where(
                Bag.id == bag_id,
                Bag.account_id == account_id
            )
            bag = session.exec(bag_statement).first()
            
            if not bag:
                errors.append(f"Row {row_num}: Bag {bag_id} not found or not accessible")
                continue
            
            # Apply phrase mapping
            processed_text, phrase_warnings = apply_phrase_map_to_script_content(
                script_text, "hook", account_id, session  # Default to hook type
            )
            warnings.extend([f"Row {row_num}: {w}" for w in phrase_warnings])
            
            # Create script
            script = Script(
                bag_id=bag_id,
                content=processed_text,
                script_type=ScriptType.hook,  # Default type for Template A
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            session.add(script)
            created_scripts.append(script)
            processed_rows += 1
            
        except ValueError as e:
            errors.append(f"Row {row_num}: Invalid bag_id - must be a number")
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    if not errors:
        session.commit()
    else:
        session.rollback()
        raise CSVImportError(f"CSV import failed with {len(errors)} errors: {'; '.join(errors[:5])}")
    
    return {
        "template": "A",
        "processed_rows": processed_rows,
        "created_scripts": len(created_scripts),
        "created_bags": 0,
        "warnings": warnings,
        "errors": errors
    }


def process_template_b_csv(
    csv_content: str, 
    account_id: int, 
    session: Session
) -> Dict[str, Any]:
    """
    Process Template B CSV: bag_id,brand,model,color,condition,hook_text,look_text,story_text,value_text,cta_text
    Creates or updates bags and their scripts.
    """
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    headers = [h.strip() for h in csv_reader.fieldnames] if csv_reader.fieldnames else []
    
    if not validate_template_b_headers(headers):
        raise CSVImportError(
            "Invalid Template B headers. Expected: bag_id,brand,model,color,condition,hook_text,look_text,story_text,value_text,cta_text"
        )
    
    processed_rows = 0
    errors = []
    warnings = []
    created_bags = []
    created_scripts = []
    bag_cache = {}  # Cache bags to avoid duplicate database hits
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            bag_id = int(row["bag_id"].strip())
            brand = row["brand"].strip()
            model = row["model"].strip()
            color = row["color"].strip()
            condition = row["condition"].strip()
            
            # Validate required bag fields
            if not all([brand, model, color, condition]):
                errors.append(f"Row {row_num}: All bag fields (brand, model, color, condition) are required")
                continue
            
            # Get or create bag using UPSERT pattern
            if bag_id not in bag_cache:
                bag_statement = select(Bag).where(Bag.id == bag_id)
                existing_bag = session.exec(bag_statement).first()
                
                if existing_bag:
                    # Update existing bag
                    existing_bag.brand = brand
                    existing_bag.model = model
                    existing_bag.color = color
                    existing_bag.condition = condition
                    existing_bag.updated_at = datetime.utcnow()
                    bag_cache[bag_id] = existing_bag
                else:
                    # Create new bag
                    new_bag = Bag(
                        id=bag_id,
                        brand=brand,
                        model=model,
                        color=color,
                        condition=condition,
                        account_id=account_id,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    session.add(new_bag)
                    bag_cache[bag_id] = new_bag
                    created_bags.append(new_bag)
            
            # Process each script type
            script_types = [
                ("hook_text", ScriptType.hook),
                ("look_text", ScriptType.look),
                ("story_text", ScriptType.story),
                ("value_text", ScriptType.value),
                ("cta_text", ScriptType.cta)
            ]
            
            for field_name, script_type in script_types:
                script_content = row[field_name].strip()
                
                if script_content:  # Only create script if content exists
                    # Apply phrase mapping
                    processed_content, phrase_warnings = apply_phrase_map_to_script_content(
                        script_content, script_type.value, account_id, session
                    )
                    warnings.extend([f"Row {row_num} ({script_type.value}): {w}" for w in phrase_warnings])
                    
                    # Check if script already exists (for upsert)
                    existing_script_statement = select(Script).where(
                        Script.bag_id == bag_id,
                        Script.script_type == script_type
                    )
                    existing_script = session.exec(existing_script_statement).first()
                    
                    if existing_script:
                        # Update existing script
                        existing_script.content = processed_content
                        existing_script.updated_at = datetime.utcnow()
                    else:
                        # Create new script
                        new_script = Script(
                            bag_id=bag_id,
                            content=processed_content,
                            script_type=script_type,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        session.add(new_script)
                        created_scripts.append(new_script)
            
            processed_rows += 1
            
        except ValueError as e:
            errors.append(f"Row {row_num}: Invalid bag_id - must be a number")
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    if not errors:
        session.commit()
    else:
        session.rollback()
        raise CSVImportError(f"CSV import failed with {len(errors)} errors: {'; '.join(errors[:5])}")
    
    return {
        "template": "B",
        "processed_rows": processed_rows,
        "created_scripts": len(created_scripts),
        "created_bags": len(created_bags),
        "warnings": warnings,
        "errors": errors
    }


def import_csv(
    csv_content: str, 
    template: str, 
    account_id: int, 
    session: Session
) -> Dict[str, Any]:
    """
    Main CSV import function that routes to appropriate template processor.
    """
    if not csv_content.strip():
        raise CSVImportError("CSV content cannot be empty")
    
    if template.lower() == "a":
        return process_template_a_csv(csv_content, account_id, session)
    elif template.lower() == "b":
        return process_template_b_csv(csv_content, account_id, session)
    else:
        raise CSVImportError("Invalid template. Must be 'a' or 'b'")


def generate_template_csv(template: str) -> str:
    """
    Generate sample CSV content for the specified template.
    """
    if template.lower() == "a":
        return """bag_id,script_text
101,"NYC girls, LOOK 💥 This vintage Chanel is calling your name!"
101,"Ladies, can you handle this HEAT? 🔥 Authentic luxury at unbeatable prices!"
102,"Stop everything! This Hermès piece just dropped and it's PERFECTION ✨"
"""
    elif template.lower() == "b":
        return """bag_id,brand,model,color,condition,hook_text,look_text,story_text,value_text,cta_text
101,Chanel,Classic Flap,Black,Excellent,"NYC girls, LOOK 💥","Pebbled canvas with signature quilting","Found in a Paris estate sale","Retail $8000, yours for $4500","DM me NOW - first come first served!"
102,Hermès,Birkin,Orange,New,"Stop everything!","Authentic Hermès craftsmanship","Direct from authorized dealer","Investment piece - only appreciates","Link in bio - payment plans available!"
"""
    else:
        raise CSVImportError("Invalid template. Must be 'a' or 'b'") 