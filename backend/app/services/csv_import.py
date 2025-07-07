import pandas as pd
import io
from typing import Dict, Any, List
from sqlmodel import Session, select
from datetime import datetime

from app.models import Bag, BagCreate


class CSVImportError(Exception):
    pass


def import_bags_csv(
    df: pd.DataFrame,
    account_id: int,
    session: Session
) -> Dict[str, Any]:
    """
    Import bags from a DataFrame with columns: name, brand, price, details, conditions
    """
    # Validate required columns
    required_columns = ['name', 'brand', 'price', 'details', 'conditions']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        raise CSVImportError(f"Missing required columns: {', '.join(missing_columns)}")
    
    # Initialize counters and lists
    total_rows = len(df)
    successful = 0
    failed = 0
    errors = []
    
    # Process each row
    for idx, row in df.iterrows():
        try:
            # Clean and validate data
            name = str(row['name']).strip() if pd.notna(row['name']) else ''
            brand = str(row['brand']).strip() if pd.notna(row['brand']) else ''
            price = float(row['price']) if pd.notna(row['price']) else 0.0
            details = str(row['details']).strip() if pd.notna(row['details']) else ''
            conditions = str(row['conditions']).strip() if pd.notna(row['conditions']) else 'Good'
            
            # Validate required fields
            if not name:
                errors.append(f"Row {idx + 2}: Name is required")
                failed += 1
                continue
                
            if not brand:
                errors.append(f"Row {idx + 2}: Brand is required")
                failed += 1
                continue
            
            # Create bag object
            # Note: 'model' field in database is populated with 'name' value
            bag = Bag(
                brand=brand,
                model=name,  # Using 'name' for the model field
                color="N/A",  # Default color as it's not in the new format
                condition=conditions,
                details=details,
                price=price,
                authenticity_verified=False,  # Default value
                account_id=account_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            session.add(bag)
            successful += 1
            
        except ValueError as e:
            errors.append(f"Row {idx + 2}: Invalid price value - {str(e)}")
            failed += 1
        except Exception as e:
            errors.append(f"Row {idx + 2}: {str(e)}")
            failed += 1
    
    # Commit if there were successful imports
    if successful > 0:
        try:
            session.commit()
        except Exception as e:
            session.rollback()
            raise CSVImportError(f"Database error: {str(e)}")
    
    return {
        "total_rows": total_rows,
        "successful": successful,
        "failed": failed,
        "errors": errors[:10]  # Limit errors to first 10
    }


def generate_template_excel() -> bytes:
    """
    Generate an Excel template with sample data
    """
    # Create sample data
    sample_data = {
        'name': ['Classic Flap Medium', 'Birkin 30', 'Lady Dior Medium'],
        'brand': ['Chanel', 'Hermès', 'Dior'],
        'price': [7500.00, 15000.00, 5500.00],
        'details': [
            'Quilted caviar leather, gold hardware, excellent condition',
            'Togo leather, palladium hardware, includes box and dust bag',
            'Cannage lambskin, silver hardware, limited edition'
        ],
        'conditions': ['Excellent', 'Like New', 'Very Good']
    }
    
    # Create DataFrame
    df = pd.DataFrame(sample_data)
    
    # Write to Excel buffer
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Bags Import', index=False)
        
        # Get the worksheet
        worksheet = writer.sheets['Bags Import']
        
        # Adjust column widths
        column_widths = {'A': 25, 'B': 15, 'C': 10, 'D': 50, 'E': 15}
        for col, width in column_widths.items():
            worksheet.column_dimensions[col].width = width
        
        # Add header formatting
        for cell in worksheet[1]:
            cell.font = cell.font.copy(bold=True)
    
    buffer.seek(0)
    return buffer.getvalue()


# Keep old functions for backward compatibility but mark as deprecated
def validate_template_a_headers(headers: List[str]) -> bool:
    """DEPRECATED - Use new import format"""
    return False


def validate_template_b_headers(headers: List[str]) -> bool:
    """DEPRECATED - Use new import format"""
    return False


def process_template_a_csv(csv_content: str, account_id: int, session: Session) -> Dict[str, Any]:
    """DEPRECATED - Use new import format"""
    raise CSVImportError("Template A is deprecated. Please use the new import format.")


def process_template_b_csv(csv_content: str, account_id: int, session: Session) -> Dict[str, Any]:
    """DEPRECATED - Use new import format"""
    raise CSVImportError("Template B is deprecated. Please use the new import format.")


def import_csv(csv_content: str, template: str, account_id: int, session: Session) -> Dict[str, Any]:
    """DEPRECATED - Use import_bags_csv instead"""
    raise CSVImportError("This function is deprecated. Please use the new import format.")


def generate_template_csv(template: str) -> str:
    """DEPRECATED - Use generate_template_excel instead"""
    return "name,brand,price,details,conditions\nClassic Flap,Chanel,7500,Excellent condition,Excellent" 