from typing import Annotated, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.deps import get_db, get_current_admin_user, get_current_streamer_user, get_account_access_filter
from app.models import Account, PhraseMap

router = APIRouter()

class PhraseMappingCreate(BaseModel):
    trigger_phrase: str
    response_text: str
    action_type: str = "response"
    category: str = "general"
    priority: int = 1
    is_active: bool = True

class PhraseMappingUpdate(BaseModel):
    trigger_phrase: Optional[str] = None
    response_text: Optional[str] = None
    action_type: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/phrase-mappings")
def get_phrase_mappings(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> List[dict]:
    """
    Get all phrase mappings in frontend format.
    """
    statement = select(PhraseMap)
    
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    phrase_maps = session.exec(statement).all()
    
    # Transform to frontend format
    result = []
    for pm in phrase_maps:
        result.append({
            "id": pm.id,
            "trigger_phrase": pm.find_phrase,
            "response_text": pm.replace_phrase,
            "action_type": "response",  # Default since not in model
            "is_active": pm.active,
            "category": "general",  # Default since not in model
            "priority": 1,  # Default since not in model
            "created_at": pm.created_at.isoformat(),
            "updated_at": pm.created_at.isoformat(),  # No updated_at in model
            "usage_count": 0  # Not tracked in current model
        })
    
    return result


@router.post("/phrase-mappings")
def create_phrase_mapping(
    mapping_data: PhraseMappingCreate,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> dict:
    """
    Create a new phrase mapping.
    """
    # Check for duplicates
    existing = session.exec(
        select(PhraseMap).where(
            PhraseMap.account_id == current_user.id,
            PhraseMap.find_phrase == mapping_data.trigger_phrase,
            PhraseMap.active == True
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Active phrase mapping for '{mapping_data.trigger_phrase}' already exists"
        )
    
    # Create new phrase map
    phrase_map = PhraseMap(
        find_phrase=mapping_data.trigger_phrase,
        replace_phrase=mapping_data.response_text,
        active=mapping_data.is_active,
        account_id=current_user.id
    )
    
    session.add(phrase_map)
    session.commit()
    session.refresh(phrase_map)
    
    return {
        "id": phrase_map.id,
        "trigger_phrase": phrase_map.find_phrase,
        "response_text": phrase_map.replace_phrase,
        "action_type": mapping_data.action_type,
        "is_active": phrase_map.active,
        "category": mapping_data.category,
        "priority": mapping_data.priority,
        "created_at": phrase_map.created_at.isoformat(),
        "updated_at": phrase_map.created_at.isoformat(),
        "usage_count": 0
    }


@router.put("/phrase-mappings/{mapping_id}")
def update_phrase_mapping(
    mapping_id: int,
    update_data: PhraseMappingUpdate,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Update a phrase mapping.
    """
    statement = select(PhraseMap).where(PhraseMap.id == mapping_id)
    
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    phrase_map = session.exec(statement).first()
    if not phrase_map:
        raise HTTPException(status_code=404, detail="Phrase mapping not found")
    
    # Update fields
    if update_data.trigger_phrase is not None:
        phrase_map.find_phrase = update_data.trigger_phrase
    if update_data.response_text is not None:
        phrase_map.replace_phrase = update_data.response_text
    if update_data.is_active is not None:
        phrase_map.active = update_data.is_active
    
    session.add(phrase_map)
    session.commit()
    session.refresh(phrase_map)
    
    return {
        "id": phrase_map.id,
        "trigger_phrase": phrase_map.find_phrase,
        "response_text": phrase_map.replace_phrase,
        "action_type": update_data.action_type or "response",
        "is_active": phrase_map.active,
        "category": update_data.category or "general",
        "priority": update_data.priority or 1,
        "created_at": phrase_map.created_at.isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "usage_count": 0
    }


@router.delete("/phrase-mappings/{mapping_id}")
def delete_phrase_mapping(
    mapping_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Delete a phrase mapping.
    """
    statement = select(PhraseMap).where(PhraseMap.id == mapping_id)
    
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    phrase_map = session.exec(statement).first()
    if not phrase_map:
        raise HTTPException(status_code=404, detail="Phrase mapping not found")
    
    # Deactivate instead of hard delete
    phrase_map.active = False
    session.add(phrase_map)
    session.commit()
    
    return {"message": "Phrase mapping deleted successfully"}


@router.post("/phrase-mappings/test")
def test_phrase_mapping(
    test_data: dict,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Test a phrase against existing mappings.
    """
    test_phrase = test_data.get("phrase", "").lower()
    
    # Find matching phrase mappings
    statement = select(PhraseMap).where(PhraseMap.active == True)
    
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    phrase_maps = session.exec(statement).all()
    
    # Check for matches
    for pm in phrase_maps:
        if pm.find_phrase.lower() in test_phrase:
            return {
                "match_found": True,
                "trigger_phrase": pm.find_phrase,
                "response_text": pm.replace_phrase,
                "action_type": "response",
                "message": f"Match found! Action: response, Response: \"{pm.replace_phrase}\""
            }
    
    return {
        "match_found": False,
        "message": "No matching phrase mapping found."
    } 