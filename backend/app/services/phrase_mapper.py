import re
from typing import List, Optional

from rapidfuzz import fuzz
from sqlmodel import Session, select

from app.models import PhraseMap


# Banned terms for Chinglish detection
BANNED_TERMS = [
    "very fashion",
    "much luxury", 
    "super beauty",
    "best quality",
    "top grade",
    "AAA quality",
    "perfect replica",
    "same as original",
    "1:1 copy",
    "mirror quality"
]


def apply_phrase_map(text: str, account_id: int, session: Session) -> tuple[str, List[str]]:
    """
    Apply phrase mapping rules to text and check for banned terms.
    
    Returns:
        tuple: (processed_text, warnings)
    """
    warnings = []
    
    # Get active phrase maps for the account
    statement = select(PhraseMap).where(
        PhraseMap.account_id == account_id,
        PhraseMap.active == True
    )
    phrase_maps = session.exec(statement).all()
    
    # Apply phrase replacements
    processed_text = text
    for phrase_map in phrase_maps:
        # Use word boundaries for precise replacement
        pattern = rf'\b{re.escape(phrase_map.find_phrase)}\b'
        processed_text = re.sub(
            pattern,
            phrase_map.replace_phrase,
            processed_text,
            flags=re.IGNORECASE
        )
    
    # Check for banned terms using RapidFuzz
    for banned_term in BANNED_TERMS:
        for word in processed_text.split():
            # Clean word of punctuation for comparison
            clean_word = re.sub(r'[^\w\s]', '', word.lower())
            similarity = fuzz.ratio(clean_word, banned_term)
            
            # If similarity is high, add warning
            if similarity > 80:  # 80% similarity threshold
                warnings.append(f"Potential Chinglish detected: '{word}' similar to '{banned_term}'")
    
    return processed_text, warnings


def apply_phrase_map_to_script_content(
    content: str, 
    script_type: str,
    account_id: int, 
    session: Session
) -> tuple[str, List[str]]:
    """
    Apply phrase mapping specifically to script content with type-specific rules.
    """
    # Apply general phrase mapping
    processed_content, warnings = apply_phrase_map(content, account_id, session)
    
    # Add type-specific processing if needed
    if script_type == "hook":
        # Ensure hook has energy
        if not any(char in processed_content for char in "!💥🔥💎✨"):
            warnings.append("Hook might need more energy - consider adding emojis or exclamation marks")
    
    elif script_type == "cta":
        # Ensure CTA has action words
        action_words = ["buy", "get", "dm", "message", "link", "shop", "order", "purchase"]
        if not any(word in processed_content.lower() for word in action_words):
            warnings.append("CTA might need stronger action words")
    
    return processed_content, warnings


def bulk_apply_phrase_map(account_id: int, session: Session) -> dict:
    """
    Re-apply phrase mapping to all scripts for an account.
    Used by the /phrase-map/rescan endpoint.
    """
    from app.models import Script, Bag
    
    # Get all scripts for the account
    statement = select(Script).join(Bag).where(Bag.account_id == account_id)
    scripts = session.exec(statement).all()
    
    updated_count = 0
    total_warnings = []
    
    for script in scripts:
        original_content = script.content
        processed_content, warnings = apply_phrase_map_to_script_content(
            original_content, 
            script.script_type,
            account_id, 
            session
        )
        
        if processed_content != original_content:
            script.content = processed_content
            updated_count += 1
        
        total_warnings.extend(warnings)
    
    session.commit()
    
    return {
        "updated_scripts": updated_count,
        "total_scripts": len(scripts),
        "warnings": total_warnings
    }


def validate_phrase_map_rule(find_phrase: str, replace_phrase: str) -> List[str]:
    """
    Validate a phrase mapping rule before saving.
    """
    errors = []
    
    if not find_phrase.strip():
        errors.append("Find phrase cannot be empty")
    
    if not replace_phrase.strip():
        errors.append("Replace phrase cannot be empty")
    
    if find_phrase == replace_phrase:
        errors.append("Find and replace phrases cannot be identical")
    
    # Check if find_phrase contains regex special characters
    regex_chars = r'[\[\]{}()+*?^$|\\.]'
    if re.search(regex_chars, find_phrase):
        errors.append("Find phrase should not contain regex special characters")
    
    return errors 