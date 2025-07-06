from typing import Annotated, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.deps import get_db, get_current_admin_user, get_current_streamer_user
from app.models import Account, MissingBag

router = APIRouter()

class MissingBagCreate(BaseModel):
    name: str
    brand: str
    expected_location: str
    last_seen: str
    status: str = "missing"
    priority: str = "medium"
    estimated_value: float
    description: str
    notes: str = ""

class MissingBagUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


@router.get("/missing-bags")
def get_missing_bags(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority")
) -> List[dict]:
    """
    Get all missing bags/items with filtering options.
    """
    # Get missing bags from database
    stmt = select(MissingBag)
    
    # Note: In the current model, MissingBag only has raw_title and resolved fields
    # We'll need to adapt this to match frontend expectations
    
    if status == "found":
        stmt = stmt.where(MissingBag.resolved == True)
    elif status == "missing":
        stmt = stmt.where(MissingBag.resolved == False)
    
    stmt = stmt.offset(skip).limit(limit)
    missing_bags = session.exec(stmt).all()
    
    # Transform database model to match frontend expectations
    result = []
    for idx, mb in enumerate(missing_bags):
        # Parse information from raw_title if possible
        # In a real implementation, you'd have a proper model with all fields
        parts = mb.raw_title.split(' - ') if ' - ' in mb.raw_title else [mb.raw_title]
        brand = parts[0].split()[0] if parts else "Unknown"
        name = mb.raw_title
        
        result.append({
            "id": mb.id,
            "name": name,
            "brand": brand,
            "expected_location": "Unknown",  # Not in current model
            "last_seen": mb.first_seen.isoformat(),
            "status": "found" if mb.resolved else "missing",
            "priority": "medium",  # Default since not in model
            "estimated_value": 0,  # Not in current model
            "description": mb.raw_title,
            "created_at": mb.created_at.isoformat(),
            "updated_at": mb.created_at.isoformat(),  # No updated_at in model
            "notes": ""
        })
    
    return result


@router.post("/missing-bags")
def create_missing_bag(
    bag_data: MissingBagCreate,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> dict:
    """
    Report a new missing bag/item.
    """
    # Create a missing bag entry
    # Note: Current model is limited, so we'll store info in raw_title
    raw_title = f"{bag_data.brand} {bag_data.name} - {bag_data.description}"
    
    missing_bag = MissingBag(
        raw_title=raw_title,
        first_seen=datetime.fromisoformat(bag_data.last_seen) if bag_data.last_seen else datetime.utcnow(),
        resolved=False
    )
    
    session.add(missing_bag)
    session.commit()
    session.refresh(missing_bag)
    
    return {
        "id": missing_bag.id,
        "name": bag_data.name,
        "brand": bag_data.brand,
        "expected_location": bag_data.expected_location,
        "last_seen": bag_data.last_seen,
        "status": bag_data.status,
        "priority": bag_data.priority,
        "estimated_value": bag_data.estimated_value,
        "description": bag_data.description,
        "created_at": missing_bag.created_at.isoformat(),
        "updated_at": missing_bag.created_at.isoformat(),
        "notes": bag_data.notes
    }


@router.put("/missing-bags/{item_id}")
def update_missing_bag(
    item_id: int,
    update_data: MissingBagUpdate,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> dict:
    """
    Update a missing bag/item status.
    """
    missing_bag = session.get(MissingBag, item_id)
    if not missing_bag:
        raise HTTPException(status_code=404, detail="Missing bag not found")
    
    # Update resolved status based on status field
    if update_data.status:
        missing_bag.resolved = update_data.status == "found"
    
    session.add(missing_bag)
    session.commit()
    session.refresh(missing_bag)
    
    # Return formatted response
    parts = missing_bag.raw_title.split(' - ') if ' - ' in missing_bag.raw_title else [missing_bag.raw_title]
    brand = parts[0].split()[0] if parts else "Unknown"
    
    return {
        "id": missing_bag.id,
        "name": missing_bag.raw_title,
        "brand": brand,
        "status": "found" if missing_bag.resolved else "missing",
        "priority": update_data.priority or "medium",
        "notes": update_data.notes or "",
        "updated_at": datetime.utcnow().isoformat()
    }


@router.delete("/missing-bags/{item_id}")
def delete_missing_bag(
    item_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)]
) -> dict:
    """
    Delete a missing bag/item record.
    """
    missing_bag = session.get(MissingBag, item_id)
    if not missing_bag:
        raise HTTPException(status_code=404, detail="Missing bag not found")
    
    session.delete(missing_bag)
    session.commit()
    
    return {"message": "Missing bag record deleted successfully"}


@router.post("/missing-bags/{item_id}/search")
def search_missing_bag(
    item_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> dict:
    """
    Search for a missing bag across the system.
    Returns possible locations with confidence scores.
    """
    missing_bag = session.get(MissingBag, item_id)
    if not missing_bag:
        raise HTTPException(status_code=404, detail="Missing bag not found")
    
    # Mock search results - in production this would query inventory systems
    search_results = [
        {
            "location": "Warehouse A - Shelf 15",
            "probability": 85,
            "last_scanned": datetime.utcnow().isoformat(),
            "confidence": "high"
        },
        {
            "location": "Display Case 5",
            "probability": 62,
            "last_scanned": datetime.utcnow().isoformat(),
            "confidence": "medium"
        },
        {
            "location": "Storage Room C",
            "probability": 38,
            "last_scanned": datetime.utcnow().isoformat(),
            "confidence": "low"
        }
    ]
    
    return {
        "item_id": item_id,
        "search_results": search_results,
        "search_timestamp": datetime.utcnow().isoformat()
    } 