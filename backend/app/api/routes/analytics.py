from typing import Annotated, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.core.deps import get_db, get_current_admin_user, get_account_access_filter
from app.models import Account, Bag, Script, Feedback
import json

router = APIRouter()

@router.get("/analytics")
def get_analytics(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)],
    range: str = Query("30d", description="Date range: 7d, 30d, 90d, 1y")
) -> dict:
    """
    Get comprehensive analytics data for the dashboard.
    Returns overview metrics, trends, top performers, and engagement data.
    """
    # Parse date range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(range, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get bags with filters
    bags_stmt = select(Bag)
    if account_filter is not None:
        bags_stmt = bags_stmt.where(Bag.account_id == account_filter)
    bags = session.exec(bags_stmt).all()
    
    # Get scripts
    scripts_stmt = select(Script).join(Bag)
    if account_filter is not None:
        scripts_stmt = scripts_stmt.where(Bag.account_id == account_filter)
    scripts = session.exec(scripts_stmt).all()
    
    # Get feedback
    feedback_stmt = select(Feedback).join(Script).join(Bag)
    if account_filter is not None:
        feedback_stmt = feedback_stmt.where(Bag.account_id == account_filter)
    feedback_stmt = feedback_stmt.where(Feedback.created_at >= start_date)
    feedbacks = session.exec(feedback_stmt).all()
    
    # Calculate overview metrics
    total_bags = len(bags)
    total_scripts = len(scripts)
    total_revenue = sum(bag.price or 0 for bag in bags)
    avg_price = total_revenue / total_bags if total_bags > 0 else 0
    
    # Calculate engagement metrics
    total_usage = sum(script.used_count for script in scripts)
    total_likes = sum(script.like_count for script in scripts)
    avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks) if feedbacks else 0
    
    # Mock some data for demonstration (in production, this would come from real analytics)
    # In a real implementation, you'd track actual sales and viewer data
    mock_conversion_rate = 12.5
    mock_viewer_engagement = 78.3
    mock_live_sessions = 15
    
    # Generate trends data (mock for now)
    trends = []
    for i in range(7):
        date = datetime.utcnow() - timedelta(days=i)
        trends.append({
            "date": date.isoformat(),
            "revenue": 15000 + (i * 2000),
            "items_sold": 3 + i,
            "viewers": 245 + (i * 50),
            "engagement": 75 + (i * 2)
        })
    trends.reverse()
    
    # Top performers by brand
    brand_performance = {}
    for bag in bags:
        if bag.brand not in brand_performance:
            brand_performance[bag.brand] = {
                "revenue": 0,
                "items_sold": 0,
                "total_price": 0
            }
        brand_performance[bag.brand]["revenue"] += bag.price or 0
        brand_performance[bag.brand]["items_sold"] += 1
        brand_performance[bag.brand]["total_price"] += bag.price or 0
    
    # Format brand performance
    brand_perf_list = []
    for brand, data in brand_performance.items():
        brand_perf_list.append({
            "brand": brand,
            "revenue": data["revenue"],
            "items_sold": data["items_sold"],
            "avg_price": data["total_price"] / data["items_sold"] if data["items_sold"] > 0 else 0,
            "conversion_rate": mock_conversion_rate * (1 + (0.1 if brand in ["Hermès", "Chanel"] else -0.1))
        })
    
    # Top performing items (mock data enhanced with real bag data)
    top_performers = []
    for i, bag in enumerate(bags[:5]):
        top_performers.append({
            "name": f"{bag.brand} {bag.model}",
            "brand": bag.brand,
            "revenue": bag.price or 0,
            "views": 1250 - (i * 100),
            "engagement_rate": 92 - (i * 5)
        })
    
    # Engagement metrics (mock)
    engagement_metrics = {
        "likes": total_likes,
        "comments": int(total_likes * 0.3),
        "shares": int(total_likes * 0.2),
        "new_followers": int(total_likes * 0.15),
        "avg_watch_time": 185
    }
    
    return {
        "overview": {
            "total_revenue": total_revenue,
            "total_items_sold": total_bags,
            "avg_selling_price": avg_price,
            "conversion_rate": mock_conversion_rate,
            "viewer_engagement": mock_viewer_engagement,
            "live_sessions": mock_live_sessions
        },
        "trends": trends,
        "top_performers": top_performers,
        "brand_performance": brand_perf_list,
        "engagement_metrics": engagement_metrics
    }


@router.get("/analytics/performance")
def get_performance_metrics(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    account_filter: Annotated[Optional[int], Depends(get_account_access_filter)]
) -> dict:
    """
    Get detailed performance metrics for scripts and bags.
    """
    # Get scripts with their bags
    scripts_stmt = select(Script).join(Bag)
    if account_filter is not None:
        scripts_stmt = scripts_stmt.where(Bag.account_id == account_filter)
    scripts = session.exec(scripts_stmt).all()
    
    # Calculate metrics by script type
    script_metrics = {}
    for script in scripts:
        if script.script_type not in script_metrics:
            script_metrics[script.script_type] = {
                "count": 0,
                "total_usage": 0,
                "total_likes": 0,
                "avg_usage": 0,
                "avg_likes": 0
            }
        
        metrics = script_metrics[script.script_type]
        metrics["count"] += 1
        metrics["total_usage"] += script.used_count
        metrics["total_likes"] += script.like_count
    
    # Calculate averages
    for script_type, metrics in script_metrics.items():
        if metrics["count"] > 0:
            metrics["avg_usage"] = metrics["total_usage"] / metrics["count"]
            metrics["avg_likes"] = metrics["total_likes"] / metrics["count"]
    
    return {
        "script_performance": script_metrics,
        "total_scripts": len(scripts),
        "total_usage": sum(s.used_count for s in scripts),
        "total_likes": sum(s.like_count for s in scripts)
    }


@router.get("/analytics/export")
def export_analytics(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    format: str = Query("json", description="Export format: json or csv")
) -> dict:
    """
    Export analytics data in various formats.
    """
    # Get all analytics data
    analytics_data = get_analytics(session, current_user, None, "30d")
    
    if format == "csv":
        # In a real implementation, this would return a CSV file
        return {
            "message": "CSV export would be implemented here",
            "data_preview": analytics_data["overview"]
        }
    
    return analytics_data 