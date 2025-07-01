from typing import Annotated, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func

from app.core.deps import get_db, get_current_streamer_user, get_current_admin_user, get_account_access_filter
from app.models import Account, Feedback, FeedbackCreate, FeedbackRead, Script, Bag

router = APIRouter()


@router.post("/feedback", response_model=FeedbackRead)
def submit_feedback(
    feedback: FeedbackCreate,
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)]
) -> FeedbackRead:
    """
    Submit feedback (👍/👎) for a script during live streaming.
    """
    # Verify the script exists and user has access
    script_statement = select(Script).join(Bag).where(
        Script.id == feedback.script_id
    )
    
    # Non-admin users can only access their own scripts
    if current_user.role != "admin" and not current_user.is_superuser:
        script_statement = script_statement.where(Bag.account_id == current_user.id)
    
    script = session.exec(script_statement).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found or access denied")
    
    # Create feedback
    db_feedback = Feedback.model_validate(feedback)
    session.add(db_feedback)
    
    # Update script like count
    if feedback.rating == 1:  # 👍
        script.like_count += 1
    elif feedback.rating == -1:  # 👎
        script.like_count = max(0, script.like_count - 1)  # Don't go below 0
    
    session.add(script)
    session.commit()
    session.refresh(db_feedback)
    
    return db_feedback


@router.get("/feedback", response_model=List[FeedbackRead])
def get_feedback(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_streamer_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)],
    script_id: Optional[int] = Query(None, description="Filter by script ID"),
    rating: Optional[int] = Query(None, ge=-1, le=1, description="Filter by rating (-1, 0, 1)"),
    limit: int = Query(50, ge=1, le=200, description="Number of feedback entries to return")
) -> List[FeedbackRead]:
    """
    Get feedback entries with optional filtering.
    """
    statement = select(Feedback).join(Script).join(Bag)
    
    # Apply account filter for non-admin users
    if account_filter is not None:
        statement = statement.where(Bag.account_id == account_filter)
    
    # Apply optional filters
    if script_id:
        statement = statement.where(Feedback.script_id == script_id)
    if rating is not None:
        statement = statement.where(Feedback.rating == rating)
    
    # Order by most recent and apply limit
    statement = statement.order_by(Feedback.live_event_ts.desc()).limit(limit)
    
    feedback_entries = session.exec(statement).all()
    return feedback_entries


@router.get("/stats/repetition")
def get_repetition_analytics(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)],
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
) -> dict:
    """
    Get analytics on script usage and repetition patterns.
    """
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Base query for scripts with access control
    base_statement = select(Script).join(Bag)
    if account_filter is not None:
        base_statement = base_statement.where(Bag.account_id == account_filter)
    
    scripts = session.exec(base_statement).all()
    
    # Get feedback in date range
    feedback_statement = select(Feedback).join(Script).join(Bag).where(
        Feedback.live_event_ts >= start_date,
        Feedback.live_event_ts <= end_date
    )
    if account_filter is not None:
        feedback_statement = feedback_statement.where(Bag.account_id == account_filter)
    
    feedback_entries = session.exec(feedback_statement).all()
    
    # Calculate statistics
    total_scripts = len(scripts)
    total_usage = sum(script.used_count for script in scripts)
    total_feedback = len(feedback_entries)
    
    # Most used scripts
    most_used = sorted(scripts, key=lambda s: s.used_count, reverse=True)[:10]
    most_used_data = [
        {
            "script_id": script.id,
            "content": script.content[:100] + "..." if len(script.content) > 100 else script.content,
            "script_type": script.script_type,
            "used_count": script.used_count,
            "like_count": script.like_count,
            "bag_id": script.bag_id
        }
        for script in most_used
    ]
    
    # Most liked scripts
    most_liked = sorted(scripts, key=lambda s: s.like_count, reverse=True)[:10]
    most_liked_data = [
        {
            "script_id": script.id,
            "content": script.content[:100] + "..." if len(script.content) > 100 else script.content,
            "script_type": script.script_type,
            "used_count": script.used_count,
            "like_count": script.like_count,
            "rating_ratio": round(script.like_count / max(script.used_count, 1), 2),
            "bag_id": script.bag_id
        }
        for script in most_liked
    ]
    
    # Usage by script type
    usage_by_type = {}
    for script in scripts:
        if script.script_type not in usage_by_type:
            usage_by_type[script.script_type] = {"count": 0, "usage": 0, "likes": 0}
        usage_by_type[script.script_type]["count"] += 1
        usage_by_type[script.script_type]["usage"] += script.used_count
        usage_by_type[script.script_type]["likes"] += script.like_count
    
    # Feedback sentiment analysis
    positive_feedback = sum(1 for f in feedback_entries if f.rating == 1)
    negative_feedback = sum(1 for f in feedback_entries if f.rating == -1)
    neutral_feedback = sum(1 for f in feedback_entries if f.rating == 0)
    
    sentiment_ratio = (
        round(positive_feedback / max(total_feedback, 1), 2) if total_feedback > 0 else 0
    )
    
    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days
        },
        "overview": {
            "total_scripts": total_scripts,
            "total_usage": total_usage,
            "avg_usage_per_script": round(total_usage / max(total_scripts, 1), 2),
            "total_feedback": total_feedback
        },
        "most_used_scripts": most_used_data,
        "most_liked_scripts": most_liked_data,
        "usage_by_type": usage_by_type,
        "feedback_sentiment": {
            "positive": positive_feedback,
            "negative": negative_feedback,
            "neutral": neutral_feedback,
            "total": total_feedback,
            "positive_ratio": sentiment_ratio
        },
        "recommendations": generate_recommendations(scripts, feedback_entries)
    }


def generate_recommendations(scripts: List[Script], feedback_entries: List[Feedback]) -> List[str]:
    """
    Generate actionable recommendations based on script usage and feedback.
    """
    recommendations = []
    
    if not scripts:
        return ["Start by adding some scripts to your inventory."]
    
    # Check for unused scripts
    unused_scripts = [s for s in scripts if s.used_count == 0]
    if len(unused_scripts) > len(scripts) * 0.5:
        recommendations.append(
            f"You have {len(unused_scripts)} unused scripts. Consider reviewing and activating them."
        )
    
    # Check for overused scripts
    total_usage = sum(s.used_count for s in scripts)
    avg_usage = total_usage / len(scripts) if scripts else 0
    overused = [s for s in scripts if s.used_count > avg_usage * 3]
    
    if overused:
        recommendations.append(
            f"You're overusing {len(overused)} scripts. Consider creating variations to avoid repetition."
        )
    
    # Check script type balance
    script_types = {}
    for script in scripts:
        script_types[script.script_type] = script_types.get(script.script_type, 0) + 1
    
    if len(script_types) < 5:  # Should have all 5 types: hook, look, story, value, cta
        missing_types = set(['hook', 'look', 'story', 'value', 'cta']) - set(script_types.keys())
        if missing_types:
            recommendations.append(
                f"Consider adding {', '.join(missing_types)} scripts for better variety."
            )
    
    # Feedback-based recommendations
    if feedback_entries:
        negative_feedback_count = sum(1 for f in feedback_entries if f.rating == -1)
        if negative_feedback_count > len(feedback_entries) * 0.3:
            recommendations.append(
                "High negative feedback detected. Review scripts that received 👎 and consider revisions."
            )
    
    # Performance recommendations
    if scripts:
        best_performing = max(scripts, key=lambda s: s.like_count / max(s.used_count, 1))
        if best_performing.like_count > 0:
            recommendations.append(
                f"Your best performing script is '{best_performing.content[:50]}...'. Consider creating similar content."
            )
    
    return recommendations if recommendations else ["Your script performance looks good! Keep up the great work."]


@router.get("/stats/performance")
def get_performance_stats(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)],
    bag_id: Optional[int] = Query(None, description="Filter by specific bag")
) -> dict:
    """
    Get performance statistics for scripts and bags.
    """
    # Base queries with access control
    scripts_statement = select(Script).join(Bag)
    if account_filter is not None:
        scripts_statement = scripts_statement.where(Bag.account_id == account_filter)
    if bag_id:
        scripts_statement = scripts_statement.where(Script.bag_id == bag_id)
    
    scripts = session.exec(scripts_statement).all()
    
    if not scripts:
        return {
            "message": "No scripts found",
            "total_scripts": 0,
            "performance_metrics": {}
        }
    
    # Calculate performance metrics
    total_usage = sum(s.used_count for s in scripts)
    total_likes = sum(s.like_count for s in scripts)
    
    performance_data = []
    for script in scripts:
        usage_rate = script.used_count / max(total_usage, 1)
        like_rate = script.like_count / max(script.used_count, 1) if script.used_count > 0 else 0
        
        performance_data.append({
            "script_id": script.id,
            "bag_id": script.bag_id,
            "script_type": script.script_type,
            "content_preview": script.content[:100] + "..." if len(script.content) > 100 else script.content,
            "used_count": script.used_count,
            "like_count": script.like_count,
            "usage_rate": round(usage_rate, 4),
            "like_rate": round(like_rate, 2),
            "performance_score": round((usage_rate * 0.3 + like_rate * 0.7), 2)
        })
    
    # Sort by performance score
    performance_data.sort(key=lambda x: x["performance_score"], reverse=True)
    
    return {
        "total_scripts": len(scripts),
        "total_usage": total_usage,
        "total_likes": total_likes,
        "avg_usage_per_script": round(total_usage / len(scripts), 2),
        "avg_likes_per_script": round(total_likes / len(scripts), 2),
        "performance_ranking": performance_data,
        "top_performers": performance_data[:5],
        "bottom_performers": performance_data[-5:] if len(performance_data) >= 5 else []
    } 