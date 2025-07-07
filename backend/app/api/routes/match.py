from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from rapidfuzz import fuzz, process
from sqlmodel import Session, select

from app.core.deps import get_db
from app.models import Bag
from app.services.websocket_manager import send_switch_command, send_missing_product_alert

router = APIRouter()


def find_bag_by_title(title: str, session: Session) -> Optional[Bag]:
    """
    Find a bag by matching the product title using fuzzy matching.
    """
    # Get all bags
    statement = select(Bag)
    bags = session.exec(statement).all()
    
    if not bags:
        return None
    
    # Create search strings for each bag
    bag_search_strings = []
    for bag in bags:
        # Create multiple search variations
        search_strings = [
            f"{bag.brand} {bag.model}",
            f"{bag.brand} {bag.model} {bag.color}",
            f"{bag.brand} {bag.color} {bag.model}",
            f"{bag.model} {bag.brand}",
            bag.brand,
            bag.model
        ]
        
        for search_string in search_strings:
            bag_search_strings.append((search_string.lower(), bag))
    
    # Find best matches using fuzzy matching
    title_lower = title.lower()
    matches = []
    
    for search_string, bag in bag_search_strings:
        similarity = fuzz.partial_ratio(title_lower, search_string)
        if similarity > 70:  # Minimum similarity threshold
            matches.append((similarity, bag))
    
    if matches:
        # Sort by similarity and return the best match
        matches.sort(key=lambda x: x[0], reverse=True)
        return matches[0][1]
    
    return None


@router.get("/match")
async def match_product_title(
    title: str = Query(..., description="Product title to match against bags"),
    session: Session = Depends(get_db)
) -> dict:
    """
    Match a product title to a bag in the database.
    Returns bag_id if found, 404 if not found.
    Used by the Chrome extension to detect product changes.
    """
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    # Try to find matching bag
    bag = find_bag_by_title(title.strip(), session)
    
    if bag:
        # Found a match - send switch command to teleprompter
        await send_switch_command(bag.id)
        
        return {
            "bag_id": bag.id,
            "bag": {
                "id": bag.id,
                "brand": bag.brand,
                "model": bag.model,
                "color": bag.color,
                "condition": bag.condition
            },
            "title": title,
            "matched": True,
            "message": "Product matched successfully"
        }
    
    else:
        # No match found - send alert
        await send_missing_product_alert(title)
        
        raise HTTPException(
            status_code=404, 
            detail={
                "message": "No matching bag found",
                "title": title,
                "matched": False,
                "suggestion": "Consider adding this product to your inventory or check for typos"
            }
        )


@router.get("/match/similar")
def get_similar_bags(
    title: str = Query(..., description="Product title to find similar bags for"),
    limit: int = Query(5, ge=1, le=20, description="Number of similar bags to return"),
    session: Session = Depends(get_db)
) -> dict:
    """
    Get similar bags for a product title (for manual matching).
    """
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    
    # Get all bags
    statement = select(Bag)
    bags = session.exec(statement).all()
    
    if not bags:
        return {
            "title": title,
            "similar_bags": [],
            "message": "No bags found in database"
        }
    
    # Calculate similarity scores
    similarities = []
    title_lower = title.lower()
    
    for bag in bags:
        search_strings = [
            f"{bag.brand} {bag.model}",
            f"{bag.brand} {bag.model} {bag.color}",
            f"{bag.brand} {bag.color} {bag.model}"
        ]
        
        max_similarity = 0
        for search_string in search_strings:
            similarity = fuzz.partial_ratio(title_lower, search_string.lower())
            max_similarity = max(max_similarity, similarity)
        
        similarities.append((max_similarity, bag))
    
    # Sort by similarity and return top results
    similarities.sort(key=lambda x: x[0], reverse=True)
    top_matches = similarities[:limit]
    
    similar_bags = []
    for similarity, bag in top_matches:
        similar_bags.append({
            "bag_id": bag.id,
            "brand": bag.brand,
            "model": bag.model,
            "color": bag.color,
            "condition": bag.condition,
            "similarity_score": similarity,
            "match_strength": (
                "Strong" if similarity >= 80 else
                "Medium" if similarity >= 60 else
                "Weak"
            )
        })
    
    return {
        "title": title,
        "similar_bags": similar_bags,
        "total_found": len(similar_bags),
        "best_match": similar_bags[0] if similar_bags else None
    }


 