from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from datetime import datetime

from app.core.deps import get_db, get_current_admin_user, get_current_streamer_user, get_account_access_filter
from app.models import Account, Script, ScriptRead, ScriptCreate, ScriptUpdate, Bag

router = APIRouter()


@router.get("/scripts", response_model=List[dict])
def get_scripts(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = Query(None, description="Filter by category/type")
) -> List[dict]:
    """
    Get all scripts with enhanced metadata for the frontend.
    """
    # Get scripts with their associated bags
    scripts_stmt = select(Script).join(Bag)
    
    if account_filter is not None:
        scripts_stmt = scripts_stmt.where(Bag.account_id == account_filter)
    
    if category:
        # Map frontend categories to backend script types
        category_map = {
            'general': 'hook',
            'opening': 'hook',
            'product-intro': 'look',
            'pricing': 'value',
            'authenticity': 'story',
            'closing': 'cta',
            'interaction': 'hook',
            'special-offer': 'value',
        }
        script_type = category_map.get(category, category)
        scripts_stmt = scripts_stmt.where(Script.script_type == script_type)
    
    scripts_stmt = scripts_stmt.offset(skip).limit(limit)
    scripts_with_bags = session.exec(scripts_stmt).all()
    
    # Get associated bags
    bag_ids = {script.bag_id for script in scripts_with_bags}
    bags_stmt = select(Bag).where(Bag.id.in_(bag_ids))
    bags = session.exec(bags_stmt).all()
    bags_dict = {bag.id: bag for bag in bags}
    
    # Format scripts for frontend
    result = []
    for script in scripts_with_bags:
        bag = bags_dict.get(script.bag_id)
        
        # Map script types to frontend categories
        category_reverse_map = {
            'hook': 'opening',
            'look': 'product-intro',
            'story': 'authenticity',
            'value': 'pricing',
            'cta': 'closing'
        }
        
        result.append({
            "id": script.id,
            "title": f"{bag.brand} {bag.model} - {script.script_type.value}" if bag else f"Script {script.id}",
            "content": script.content,
            "category": category_reverse_map.get(script.script_type.value, 'general'),
            "tags": [bag.brand, bag.color, script.script_type.value] if bag else [script.script_type.value],
            "is_favorite": script.like_count > 10,  # Consider scripts with >10 likes as favorites
            "estimated_duration": len(script.content) // 3,  # Rough estimate: 3 chars per second
            "created_at": script.created_at.isoformat(),
            "updated_at": script.updated_at.isoformat(),
            "usage_count": script.used_count,
            "bag_id": script.bag_id
        })
    
    return result


@router.post("/scripts", response_model=dict)
def create_script(
    script_data: dict,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> dict:
    """
    Create a new script. Accepts frontend format and converts to backend format.
    """
    # Map frontend categories to script types
    category_map = {
        'general': 'hook',
        'opening': 'hook',
        'product-intro': 'look',
        'pricing': 'value',
        'authenticity': 'story',
        'closing': 'cta',
        'interaction': 'hook',
        'special-offer': 'value',
    }
    
    script_type = category_map.get(script_data.get('category', 'general'), 'hook')
    
    # Find or create a default bag if no bag_id provided
    bag_id = script_data.get('bag_id')
    if not bag_id:
        # Get the first bag for this user or create a default one
        bags_stmt = select(Bag)
        if current_user.role.value != 'admin':
            bags_stmt = bags_stmt.where(Bag.account_id == current_user.id)
        first_bag = session.exec(bags_stmt).first()
        
        if first_bag:
            bag_id = first_bag.id
        else:
            # Create a default bag
            default_bag = Bag(
                brand="Generic",
                model="Item",
                color="N/A",
                condition="new",
                account_id=current_user.id
            )
            session.add(default_bag)
            session.commit()
            session.refresh(default_bag)
            bag_id = default_bag.id
    
    # Create the script
    script = Script(
        content=script_data.get('content', ''),
        script_type=script_type,
        bag_id=bag_id
    )
    
    session.add(script)
    session.commit()
    session.refresh(script)
    
    # Get the associated bag for response
    bag = session.get(Bag, bag_id)
    
    # Return in frontend format
    return {
        "id": script.id,
        "title": script_data.get('title', f"{bag.brand} {bag.model} - {script.script_type.value}"),
        "content": script.content,
        "category": script_data.get('category', 'general'),
        "tags": script_data.get('tags', '').split(',') if isinstance(script_data.get('tags'), str) else [],
        "is_favorite": script_data.get('is_favorite', False),
        "estimated_duration": script_data.get('estimated_duration', len(script.content) // 3),
        "created_at": script.created_at.isoformat(),
        "updated_at": script.updated_at.isoformat(),
        "usage_count": 0,
        "bag_id": script.bag_id
    }


@router.put("/scripts/{script_id}", response_model=dict)
def update_script(
    script_id: int,
    script_data: dict,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Update an existing script.
    """
    # Get the script with access control
    script_stmt = select(Script).join(Bag).where(Script.id == script_id)
    if account_filter is not None:
        script_stmt = script_stmt.where(Bag.account_id == account_filter)
    
    script = session.exec(script_stmt).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Update fields if provided
    if 'content' in script_data:
        script.content = script_data['content']
    
    if 'category' in script_data:
        category_map = {
            'general': 'hook',
            'opening': 'hook',
            'product-intro': 'look',
            'pricing': 'value',
            'authenticity': 'story',
            'closing': 'cta',
            'interaction': 'hook',
            'special-offer': 'value',
        }
        script.script_type = category_map.get(script_data['category'], script.script_type)
    
    # Handle favorite status through like count
    if 'is_favorite' in script_data:
        if script_data['is_favorite'] and script.like_count < 10:
            script.like_count = 11
        elif not script_data['is_favorite'] and script.like_count > 10:
            script.like_count = 5
    
    script.updated_at = datetime.utcnow()
    
    session.add(script)
    session.commit()
    session.refresh(script)
    
    # Get the associated bag
    bag = session.get(Bag, script.bag_id)
    
    # Return in frontend format
    category_reverse_map = {
        'hook': 'opening',
        'look': 'product-intro',
        'story': 'authenticity',
        'value': 'pricing',
        'cta': 'closing'
    }
    
    return {
        "id": script.id,
        "title": script_data.get('title', f"{bag.brand} {bag.model} - {script.script_type.value}"),
        "content": script.content,
        "category": category_reverse_map.get(script.script_type.value, 'general'),
        "tags": script_data.get('tags', '').split(',') if isinstance(script_data.get('tags'), str) else [bag.brand, bag.color],
        "is_favorite": script.like_count > 10,
        "estimated_duration": script_data.get('estimated_duration', len(script.content) // 3),
        "created_at": script.created_at.isoformat(),
        "updated_at": script.updated_at.isoformat(),
        "usage_count": script.used_count,
        "bag_id": script.bag_id
    }


@router.delete("/scripts/{script_id}")
def delete_script(
    script_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Delete a script.
    """
    # Get the script with access control
    script_stmt = select(Script).join(Bag).where(Script.id == script_id)
    if account_filter is not None:
        script_stmt = script_stmt.where(Bag.account_id == account_filter)
    
    script = session.exec(script_stmt).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    session.delete(script)
    session.commit()
    
    return {"message": "Script deleted successfully"}


@router.post("/scripts/{script_id}/used")
def mark_script_used(
    script_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> dict:
    """
    Mark a script as used (increment usage counter).
    """
    script = session.get(Script, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    script.used_count += 1
    script.updated_at = datetime.utcnow()
    
    session.add(script)
    session.commit()
    
    return {
        "id": script.id,
        "used_count": script.used_count,
        "message": "Script usage recorded"
    }


@router.post("/scripts/{script_id}/like")
def toggle_script_like(
    script_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> dict:
    """
    Toggle like status for a script.
    """
    script = session.get(Script, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Simple toggle - in production you'd track individual user likes
    if script.like_count > 10:
        script.like_count = 5
    else:
        script.like_count = 15
    
    script.updated_at = datetime.utcnow()
    
    session.add(script)
    session.commit()
    
    return {
        "id": script.id,
        "like_count": script.like_count,
        "is_favorite": script.like_count > 10
    } 