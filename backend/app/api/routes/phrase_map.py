from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.deps import get_db, get_current_admin_user, get_account_access_filter
from app.models import Account, PhraseMap, PhraseMapCreate, PhraseMapRead, PhraseMapUpdate
from app.services.phrase_mapper import bulk_apply_phrase_map, validate_phrase_map_rule

router = APIRouter()


@router.get("/phrase-map", response_model=List[PhraseMapRead])
def get_phrase_maps(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)],
    active_only: bool = True
) -> List[PhraseMapRead]:
    """
    Get all phrase mapping rules.
    """
    statement = select(PhraseMap)
    
    # Apply account filter
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    # Filter by active status
    if active_only:
        statement = statement.where(PhraseMap.active == True)
    
    phrase_maps = session.exec(statement).all()
    return phrase_maps


@router.post("/phrase-map", response_model=PhraseMapRead)
def create_phrase_map(
    phrase_map: PhraseMapCreate,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)]
) -> PhraseMapRead:
    """
    Create a new phrase mapping rule.
    """
    # Validate the rule
    errors = validate_phrase_map_rule(phrase_map.find_phrase, phrase_map.replace_phrase)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation errors: {'; '.join(errors)}"
        )
    
    # Check for duplicate find_phrase for the account
    existing_statement = select(PhraseMap).where(
        PhraseMap.account_id == phrase_map.account_id,
        PhraseMap.find_phrase == phrase_map.find_phrase,
        PhraseMap.active == True
    )
    existing = session.exec(existing_statement).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Active phrase mapping for '{phrase_map.find_phrase}' already exists"
        )
    
    # Create new phrase map
    db_phrase_map = PhraseMap.model_validate(phrase_map)
    session.add(db_phrase_map)
    session.commit()
    session.refresh(db_phrase_map)
    
    return db_phrase_map


@router.get("/phrase-map/{phrase_map_id}", response_model=PhraseMapRead)
def get_phrase_map(
    phrase_map_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> PhraseMapRead:
    """
    Get a specific phrase mapping rule.
    """
    statement = select(PhraseMap).where(PhraseMap.id == phrase_map_id)
    
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    phrase_map = session.exec(statement).first()
    if not phrase_map:
        raise HTTPException(status_code=404, detail="Phrase mapping not found")
    
    return phrase_map


@router.put("/phrase-map/{phrase_map_id}", response_model=PhraseMapRead)
def update_phrase_map(
    phrase_map_id: int,
    phrase_map_update: PhraseMapUpdate,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> PhraseMapRead:
    """
    Update a phrase mapping rule.
    """
    # Get existing phrase map
    statement = select(PhraseMap).where(PhraseMap.id == phrase_map_id)
    
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    phrase_map = session.exec(statement).first()
    if not phrase_map:
        raise HTTPException(status_code=404, detail="Phrase mapping not found")
    
    # Validate if find_phrase or replace_phrase are being updated
    if phrase_map_update.find_phrase or phrase_map_update.replace_phrase:
        find_phrase = phrase_map_update.find_phrase or phrase_map.find_phrase
        replace_phrase = phrase_map_update.replace_phrase or phrase_map.replace_phrase
        
        errors = validate_phrase_map_rule(find_phrase, replace_phrase)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation errors: {'; '.join(errors)}"
            )
        
        # Check for duplicate find_phrase (excluding current record)
        if phrase_map_update.find_phrase and phrase_map_update.find_phrase != phrase_map.find_phrase:
            existing_statement = select(PhraseMap).where(
                PhraseMap.account_id == phrase_map.account_id,
                PhraseMap.find_phrase == phrase_map_update.find_phrase,
                PhraseMap.active == True,
                PhraseMap.id != phrase_map_id
            )
            existing = session.exec(existing_statement).first()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Active phrase mapping for '{phrase_map_update.find_phrase}' already exists"
                )
    
    # Update the phrase map
    phrase_map_data = phrase_map_update.model_dump(exclude_unset=True)
    for field, value in phrase_map_data.items():
        setattr(phrase_map, field, value)
    
    session.add(phrase_map)
    session.commit()
    session.refresh(phrase_map)
    
    return phrase_map


@router.delete("/phrase-map/{phrase_map_id}")
def delete_phrase_map(
    phrase_map_id: int,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Delete (deactivate) a phrase mapping rule.
    """
    statement = select(PhraseMap).where(PhraseMap.id == phrase_map_id)
    
    if account_filter is not None:
        statement = statement.where(PhraseMap.account_id == account_filter)
    
    phrase_map = session.exec(statement).first()
    if not phrase_map:
        raise HTTPException(status_code=404, detail="Phrase mapping not found")
    
    # Deactivate instead of deleting
    phrase_map.active = False
    session.add(phrase_map)
    session.commit()
    
    return {"message": "Phrase mapping deactivated successfully"}


@router.post("/phrase-map/rescan")
def rescan_phrase_maps(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)]
) -> dict:
    """
    Re-apply all active phrase mapping rules to all scripts for the current account.
    """
    try:
        result = bulk_apply_phrase_map(current_user.id, session)
        
        return {
            "message": "Phrase mapping rescan completed successfully",
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during phrase mapping rescan: {str(e)}"
        )


@router.get("/phrase-map/validate")
def validate_phrase_rule(
    find_phrase: str,
    replace_phrase: str,
    current_user: Annotated[Account, Depends(get_current_admin_user)]
) -> dict:
    """
    Validate a phrase mapping rule without saving it.
    """
    errors = validate_phrase_map_rule(find_phrase, replace_phrase)
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "find_phrase": find_phrase,
        "replace_phrase": replace_phrase
    }


@router.get("/phrase-map/preview")
def preview_phrase_mapping(
    text: str,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)]
) -> dict:
    """
    Preview how text would be transformed by current phrase mapping rules.
    """
    from app.services.phrase_mapper import apply_phrase_map
    
    processed_text, warnings = apply_phrase_map(text, current_user.id, session)
    
    return {
        "original_text": text,
        "processed_text": processed_text,
        "changed": text != processed_text,
        "warnings": warnings
    } 