from fastapi import APIRouter

from app.api.v1 import (
    assistant,
    auth,
    users,
    sellers,
    products,
    categories,
    carts,
    orders,
    payments,
    services,
    listings,
    bookings,
    reviews,
    delivery_partners,
    deliveries,
    coupons,
    commissions,
    payouts,
    wishlists,
    cart_flow,
    seller_payment_details,
    payments_upi,
    seller_orders_dashboard,
    order_tracking,
    recommendations,
    recommendations_personalized,
    coins,
    preferences,
    search,
    profiles,
    social,
    user_activity,
)

from app.api import upload

router = APIRouter()

# Assistant
router.include_router(assistant.router, prefix="/assistant", tags=["assistant"])

# Authentication
router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Users
router.include_router(users.router, prefix="/users", tags=["users"])

# Sellers
router.include_router(sellers.router, prefix="/sellers", tags=["sellers"])

# Products
router.include_router(products.router, prefix="/products", tags=["products"])

# Categories
router.include_router(categories.router, prefix="/categories", tags=["categories"])

# Upload
router.include_router(upload.router, prefix="/upload", tags=["upload"])

# Carts
router.include_router(carts.router, prefix="/carts", tags=["carts"])

# Orders
router.include_router(orders.router, prefix="/orders", tags=["orders"])

# Profile
router.include_router(profiles.router, prefix="/profile", tags=["profile"])

# Social
router.include_router(social.router, prefix="/social", tags=["social"])

# Recommendations (personalized)
router.include_router(
    recommendations_personalized.router,
    prefix="/recommendations",
    tags=["recommendations"],
)

# Payments
router.include_router(payments.router, prefix="/payments", tags=["payments"])

# Services
router.include_router(services.router, prefix="/services", tags=["services"])

# Listings
router.include_router(listings.router, prefix="/listings", tags=["listings"])

# Bookings
router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])

# Reviews
router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])

# Delivery
router.include_router(
    delivery_partners.router,
    prefix="/delivery-partners",
    tags=["delivery-partners"],
)
router.include_router(deliveries.router, prefix="/deliveries", tags=["deliveries"])

# Coupons
router.include_router(coupons.router, prefix="/coupons", tags=["coupons"])

# Commissions
router.include_router(commissions.router, prefix="/commissions", tags=["commissions"])

# Payouts
router.include_router(payouts.router, prefix="/payouts", tags=["payouts"])

# Wishlist
router.include_router(wishlists.router, prefix="/wishlists", tags=["wishlists"])

# Cart Flow
router.include_router(cart_flow.router, tags=["cart-flow"])

# Seller Payment Details
router.include_router(seller_payment_details.router, tags=["seller-payment-details"])

# UPI Payments
router.include_router(payments_upi.router, tags=["upi-payments"])

# Seller Orders Dashboard
router.include_router(seller_orders_dashboard.router, tags=["seller-orders-dashboard"])

# Order Tracking
router.include_router(order_tracking.router, tags=["order-tracking"])

# Recommendations
router.include_router(recommendations.router, tags=["recommendations"])

# Coins
router.include_router(coins.router, prefix="/coins", tags=["coins"])

# Preferences
router.include_router(preferences.router, tags=["preferences"])

# Search
router.include_router(search.router, tags=["search"])

# User Activity
router.include_router(user_activity.router, tags=["user-activity"])


@router.get("/health")
def health_check():
    return {"status": "healthy"}