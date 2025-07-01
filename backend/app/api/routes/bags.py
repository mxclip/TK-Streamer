from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.core.deps import get_db, get_current_admin_user, get_current_streamer_user, get_account_access_filter
from app.models import Account, Bag, BagRead, Script, ScriptRead

router = APIRouter()


@router.get("/bags", response_model=List[BagRead])
def get_bags(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)],
    skip: int = Query(0, ge=0, description="Number of bags to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of bags to return"),
    brand: Optional[str] = Query(None, description="Filter by brand"),
    condition: Optional[str] = Query(None, description="Filter by condition")
) -> List[BagRead]:
    """
    Get all bags with optional filtering.
    Admin users can see all bags, streamers only their own.
    """
    statement = select(Bag)
    
    # Apply account filter for non-admin users
    if account_filter is not None:
        statement = statement.where(Bag.account_id == account_filter)
    
    # Apply optional filters
    if brand:
        statement = statement.where(Bag.brand.ilike(f"%{brand}%"))
    if condition:
        statement = statement.where(Bag.condition.ilike(f"%{condition}%"))
    
    # Apply pagination
    statement = statement.offset(skip).limit(limit)
    
    bags = session.exec(statement).all()
    return bags


@router.get("/bag/{bag_id}/scripts", response_model=List[ScriptRead])
def get_bag_scripts(
    bag_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> List[ScriptRead]:
    """
    Get all scripts for a specific bag.
    Both admin and streamer users can access this endpoint.
    """
    # First verify the bag exists and user has access
    bag_statement = select(Bag).where(Bag.id == bag_id)
    if account_filter is not None:
        bag_statement = bag_statement.where(Bag.account_id == account_filter)
    
    bag = session.exec(bag_statement).first()
    if not bag:
        raise HTTPException(status_code=404, detail="Bag not found")
    
    # Get scripts for the bag
    scripts_statement = select(Script).where(Script.bag_id == bag_id)
    scripts = session.exec(scripts_statement).all()
    
    return scripts


@router.get("/bag/{bag_id}")
def get_bag_details(
    bag_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Get detailed information about a bag including all its scripts.
    """
    # Verify bag exists and user has access
    bag_statement = select(Bag).where(Bag.id == bag_id)
    if account_filter is not None:
        bag_statement = bag_statement.where(Bag.account_id == account_filter)
    
    bag = session.exec(bag_statement).first()
    if not bag:
        raise HTTPException(status_code=404, detail="Bag not found")
    
    # Get scripts grouped by type
    scripts_statement = select(Script).where(Script.bag_id == bag_id)
    scripts = session.exec(scripts_statement).all()
    
    scripts_by_type = {}
    for script in scripts:
        if script.script_type not in scripts_by_type:
            scripts_by_type[script.script_type] = []
        scripts_by_type[script.script_type].append({
            "id": script.id,
            "content": script.content,
            "used_count": script.used_count,
            "like_count": script.like_count,
            "created_at": script.created_at,
            "updated_at": script.updated_at
        })
    
    return {
        "bag": {
            "id": bag.id,
            "brand": bag.brand,
            "model": bag.model,
            "color": bag.color,
            "condition": bag.condition,
            "account_id": bag.account_id,
            "created_at": bag.created_at,
            "updated_at": bag.updated_at
        },
        "scripts": scripts_by_type,
        "script_count": len(scripts),
        "total_usage": sum(script.used_count for script in scripts),
        "total_likes": sum(script.like_count for script in scripts)
    }


@router.get("/bags/stats")
def get_bags_stats(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Get statistics about bags and scripts.
    """
    # Count bags
    bags_statement = select(Bag)
    if account_filter is not None:
        bags_statement = bags_statement.where(Bag.account_id == account_filter)
    bags = session.exec(bags_statement).all()
    
    # Count scripts
    scripts_statement = select(Script).join(Bag)
    if account_filter is not None:
        scripts_statement = scripts_statement.where(Bag.account_id == account_filter)
    scripts = session.exec(scripts_statement).all()
    
    # Group by brand
    brands = {}
    for bag in bags:
        if bag.brand not in brands:
            brands[bag.brand] = 0
        brands[bag.brand] += 1
    
    # Script type distribution
    script_types = {}
    for script in scripts:
        if script.script_type not in script_types:
            script_types[script.script_type] = 0
        script_types[script.script_type] += 1
    
    return {
        "total_bags": len(bags),
        "total_scripts": len(scripts),
        "brands": brands,
        "script_types": script_types,
        "avg_scripts_per_bag": round(len(scripts) / len(bags), 2) if bags else 0,
        "total_usage": sum(script.used_count for script in scripts),
        "total_likes": sum(script.like_count for script in scripts)
    } 