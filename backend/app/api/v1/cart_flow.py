from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_active_user, get_current_active_seller
from math import radians, sin, cos, sqrt, atan2

router = APIRouter()


@router.get("/cart/{user_id}", response_model=schemas.CartDetail)
def get_cart(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Return cart items with product details and seller info (requires user role)."""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this cart")

    cart = crud.get_cart_by_user_id(db, user_id=user_id)
    if not cart:
        cart = crud.create_cart(db, schemas.CartCreate(user_id=user_id))

    cart_items = []
    for item in cart.items:
        product = item.product
        if not product:
            continue
        seller = product.seller
        cart_items.append(
            schemas.CartItemDetail(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                quantity=item.quantity,
                product=product,
                seller=seller,
            )
        )

    return schemas.CartDetail(
        id=cart.id,
        user_id=cart.user_id,
        is_active=cart.is_active,
        items=cart_items,
    )


@router.post("/cart/add", response_model=schemas.CartItem)
def add_to_cart(
    payload: schemas.CartAddRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Add product to cart or increase quantity (requires user role)."""
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this cart")
    if payload.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    cart = crud.get_cart_by_user_id(db, user_id=payload.user_id)
    if not cart:
        cart = crud.create_cart(db, schemas.CartCreate(user_id=payload.user_id))

    product = crud.get_product(db, product_id=payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing_item = crud.get_cart_item_by_cart_and_product(
        db, cart_id=cart.id, product_id=payload.product_id
    )
    if existing_item:
        existing_item.quantity += payload.quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item

    item = schemas.CartItemCreate(product_id=payload.product_id, quantity=payload.quantity)
    return crud.create_cart_item(db, item, cart_id=cart.id)


@router.post("/cart/remove", response_model=schemas.CartItem)
def remove_from_cart(
    payload: schemas.CartRemoveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Remove item from cart (requires user role)."""
    if payload.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this cart")

    db_item = crud.get_cart_item(db, cart_item_id=payload.item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if db_item.cart.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to remove this cart item")

    return crud.delete_cart_item(db, cart_item_id=payload.item_id)


def _build_order_detail(order: models.Order) -> schemas.OrderDetail:
    items = []
    for item in order.order_items:
        product = item.product
        seller = product.seller if product else None
        items.append(
            schemas.OrderItemDetail(
                id=item.id,
                order_id=item.order_id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_purchase=item.price_at_purchase,
                product=product,
                seller=seller,
            )
        )

    return schemas.OrderDetail(
        id=order.id,
        user_id=order.user_id,
        seller_id=order.seller_id,
        total_amount=order.total_amount,
        status=order.status,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        commission_amount=order.commission_amount,
        seller_earning=order.seller_earning,
        platform_earning=order.platform_earning,
        shipping_address=order.shipping_address,
        created_at=order.created_at,
        updated_at=order.updated_at,
        order_items=items,
    )


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


@router.post("/checkout")
def checkout(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Create an order for a single product with delivery charge, coupon, and payment method."""
    product_id = payload.get("product_id")
    quantity = payload.get("quantity")
    address = payload.get("address")
    payment_method = payload.get("payment_method")
    buyer_lat = payload.get("buyer_lat")
    buyer_lng = payload.get("buyer_lng")
    coupon_code = payload.get("coupon_code")
    use_coins = bool(payload.get("use_coins"))

    if not all([product_id, quantity, address, payment_method, buyer_lat, buyer_lng]):
        raise HTTPException(status_code=400, detail="Missing required checkout fields")

    if payment_method not in {"upi", "cod"}:
        raise HTTPException(status_code=400, detail="Invalid payment method")

    product = crud.get_product(db, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    seller = product.seller
    if not seller or seller.latitude is None or seller.longitude is None:
        raise HTTPException(status_code=400, detail="Seller location not available")

    distance = _haversine_distance(float(buyer_lat), float(buyer_lng), seller.latitude, seller.longitude)
    delivery_rate = seller.delivery_per_km if seller.delivery_per_km is not None else seller.delivery_rate
    delivery_charge = round(distance * delivery_rate, 2)

    subtotal_amount = round(product.price * int(quantity), 2)
    total_amount = round(subtotal_amount + delivery_charge, 2)
    payment_status = "pending"

    platform_settings = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
    commission_percent = platform_settings.commission_percent if platform_settings else 0.0
    coin_value = platform_settings.coin_value_in_rupees if platform_settings else 1.0

    discount = 0.0
    if coupon_code:
        if not crud.coupon.is_coupon_valid(db, coupon_code=coupon_code, purchase_amount=subtotal_amount):
            raise HTTPException(status_code=400, detail="Invalid or expired coupon")
        discount = crud.coupon.calculate_discount(db, coupon_code=coupon_code, purchase_amount=subtotal_amount)

    used_coins = 0
    if use_coins:
        wallet = crud.get_or_create_wallet(db, user_id=current_user.id)
        if wallet.balance > 0:
            coin_discount = min(wallet.balance * coin_value, total_amount - discount)
            used_coins = int(coin_discount / coin_value)
            if used_coins > 0:
                discount = round(discount + coin_discount, 2)
                crud.spend_coins(
                    db,
                    current_user.id,
                    used_coins,
                    "checkout",
                    activity_metadata=f"order:{product_id}",
                )

    final_amount = round(total_amount - discount, 2)

    commission_amount = round(final_amount * (commission_percent / 100), 2)
    seller_earning = round(final_amount - commission_amount, 2)
    platform_earning = commission_amount

    db_order = models.Order(
        user_id=current_user.id,
        seller_id=product.seller_id,
        total_amount=subtotal_amount,
        discount_amount=discount,
        final_amount=final_amount,
        coupon_code=coupon_code,
        status=models.OrderStatus.pending,
        payment_method=payment_method,
        payment_status=payment_status,
        commission_amount=commission_amount,
        seller_earning=seller_earning,
        platform_earning=platform_earning,
        shipping_address=address,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    db_order_item = models.OrderItem(
        order_id=db_order.id,
        product_id=product.id,
        quantity=int(quantity),
        price_at_purchase=product.price,
    )
    db.add(db_order_item)
    product.stock -= int(quantity)
    db.commit()

    if coupon_code:
        crud.coupon.increment_usage(db, coupon_code=coupon_code)

    upi_qr = None
    if payment_method == "upi":
        details = crud.get_payment_details_by_seller(db, seller_id=product.seller_id)
        if not details:
            raise HTTPException(status_code=404, detail="Seller UPI details not found")
        upi_qr = f"upi://pay?pa={details.upi_id}&pn={seller.business_name}&am={final_amount}&cu=INR"

    return {
        "order_id": db_order.id,
        "seller_name": seller.business_name,
        "subtotal_amount": subtotal_amount,
        "delivery_charge": delivery_charge,
        "discount_amount": discount,
        "final_amount": final_amount,
        "payment_method": payment_method,
        "upi_qr": upi_qr,
        "coins_used": used_coins,
        "coins_balance": crud.get_or_create_wallet(db, user_id=current_user.id).balance,
    }


@router.get("/my-orders", response_model=list[schemas.OrderDetail])
def my_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """List all orders for the logged-in user (requires user role)."""
    orders = crud.get_orders_by_user(db, user_id=current_user.id)
    return [_build_order_detail(order) for order in orders]


@router.get("/seller-orders/{seller_id}", response_model=list[schemas.OrderDetail])
def seller_orders(seller_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_seller)):
    """Seller can see orders of their products (requires seller role)."""
    seller = crud.get_seller(db, seller_id=seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    if seller.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view orders for this seller")

    orders = crud.get_orders(db)
    seller_orders = []
    for order in orders:
        items = []
        for item in order.order_items:
            product = item.product
            if product and product.seller_id == seller_id:
                items.append(
                    schemas.OrderItemDetail(
                        id=item.id,
                        order_id=item.order_id,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        price_at_purchase=item.price_at_purchase,
                        product=product,
                        seller=product.seller,
                    )
                )
        if items:
            seller_orders.append(
                schemas.OrderDetail(
                    id=order.id,
                    user_id=order.user_id,
                    total_amount=order.total_amount,
                    status=order.status,
                    shipping_address=order.shipping_address,
                    created_at=order.created_at,
                    updated_at=order.updated_at,
                    order_items=items,
                )
            )
    return seller_orders
