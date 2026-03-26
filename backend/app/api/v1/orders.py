from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.db.session import get_db
from app.core.security import get_current_user, get_current_active_admin, get_current_active_user, get_current_active_seller, get_current_active_delivery_partner
from app.models.user import RoleEnum

router = APIRouter()


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
        total_amount=order.total_amount,
        discount_amount=order.discount_amount,
        final_amount=order.final_amount,
        coupon_code=order.coupon_code,
        status=order.status,
        shipping_address=order.shipping_address,
        created_at=order.created_at,
        updated_at=order.updated_at,
        order_items=items,
    )


@router.get("/", response_model=list[schemas.Order])
def read_orders(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Get all orders with pagination (requires admin role)"""
    orders = crud.get_orders(db, skip=skip, limit=limit)
    return orders


@router.get("/{order_id}", response_model=schemas.OrderDetail)
def read_order(order_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get an order by ID (requires authentication)"""
    order = crud.get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Allow access to:
    # 1. Admin users
    # 2. The user who placed the order
    # 3. The seller of the products in the order
    # 4. Delivery partners assigned to the order
    
    if current_user.role == RoleEnum.ADMIN:
        return _build_order_detail(order)
    
    if current_user.role in {RoleEnum.USER, RoleEnum.BUYER, RoleEnum.BOTH} and order.user_id == current_user.id:
        return _build_order_detail(order)
    
    if current_user.role == RoleEnum.SELLER:
        seller = crud.get_seller_by_user_id(db, current_user.id)
        if seller and any(item.product.seller_id == seller.id for item in order.order_items):
            return _build_order_detail(order)
    
    if current_user.role == RoleEnum.DELIVERY_PARTNER:
        # Check if order has a delivery assigned to this delivery partner
        # This would require a delivery table with order_id and delivery_partner_id
        pass  # Implement this check if delivery system exists
    
    raise HTTPException(status_code=403, detail="Not authorized to view this order")


@router.get("/user/{user_id}", response_model=list[schemas.OrderDetail])
def read_orders_by_user(user_id: int, skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all orders by user with pagination (requires authentication)"""
    if current_user.role == RoleEnum.ADMIN:
        orders = crud.get_orders_by_user(db, user_id=user_id, skip=skip, limit=limit)
        return [_build_order_detail(order) for order in orders]
    
    if current_user.role in {RoleEnum.USER, RoleEnum.BUYER, RoleEnum.BOTH} and user_id == current_user.id:
        orders = crud.get_orders_by_user(db, user_id=user_id, skip=skip, limit=limit)
        return [_build_order_detail(order) for order in orders]
    
    raise HTTPException(status_code=403, detail="Not authorized to view orders for this user")


@router.post("/from-cart/{user_id}", response_model=schemas.OrderDetail)
def create_order_from_cart(user_id: int, order: schemas.OrderCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create an order from the user's active cart (requires user role)"""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create an order for this user")
    
    try:
        db_order = crud.create_order_from_cart(
            db,
            user_id=user_id,
            shipping_address=order.shipping_address,
            coupon_code=order.coupon_code,
            payment_method=order.payment_method.value if order.payment_method else None,
            subtotal_amount=order.subtotal_amount,
            delivery_charge=order.delivery_charge,
        )
        if order.use_coins:
            try:
                wallet = crud.get_or_create_wallet(db, user_id=current_user.id)
                if wallet.balance > 0:
                    coin_value = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
                    coin_value = coin_value.coin_value_in_rupees if coin_value else 1.0
                    coin_discount = min(wallet.balance * coin_value, db_order.final_amount)
                    coins_to_use = int(coin_discount / coin_value)
                    if coins_to_use > 0:
                        crud.spend_coins(
                            db,
                            current_user.id,
                            coins_to_use,
                            "cart_checkout",
                            activity_metadata=f"order:{db_order.id}",
                        )
            except ValueError:
                pass
        return _build_order_detail(db_order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/checkout/{user_id}", response_model=schemas.OrderDetail)
def checkout_from_cart(user_id: int, order: schemas.OrderCreate, current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Convert cart to order and clear cart (requires user role)."""
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to checkout for this user")
    
    try:
        db_order = crud.create_order_from_cart(
            db,
            user_id=user_id,
            shipping_address=order.shipping_address,
            coupon_code=order.coupon_code,
            payment_method=order.payment_method.value if order.payment_method else None,
            subtotal_amount=order.subtotal_amount,
            delivery_charge=order.delivery_charge,
        )
        if order.use_coins:
            try:
                wallet = crud.get_or_create_wallet(db, user_id=current_user.id)
                if wallet.balance > 0:
                    coin_value = db.query(models.PlatformSettings).order_by(models.PlatformSettings.id.desc()).first()
                    coin_value = coin_value.coin_value_in_rupees if coin_value else 1.0
                    coin_discount = min(wallet.balance * coin_value, db_order.final_amount)
                    coins_to_use = int(coin_discount / coin_value)
                    if coins_to_use > 0:
                        crud.spend_coins(
                            db,
                            current_user.id,
                            coins_to_use,
                            "cart_checkout",
                            activity_metadata=f"order:{db_order.id}",
                        )
            except ValueError:
                pass
        return _build_order_detail(db_order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-orders/{user_id}", response_model=list[schemas.OrderDetail])
def read_my_orders(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all orders for a user with items (requires authentication)."""
    if current_user.role == RoleEnum.ADMIN:
        orders = crud.get_orders_by_user(db, user_id=user_id)
        return [_build_order_detail(order) for order in orders]
    
    if current_user.role in {RoleEnum.USER, RoleEnum.BUYER, RoleEnum.BOTH} and user_id == current_user.id:
        orders = crud.get_orders_by_user(db, user_id=user_id)
        return [_build_order_detail(order) for order in orders]

    raise HTTPException(status_code=403, detail="Not authorized to view orders for this user")


@router.get("/seller-orders/{seller_id}", response_model=list[schemas.OrderDetail])
def read_seller_orders(seller_id: int, current_user: models.User = Depends(get_current_active_seller), db: Session = Depends(get_db)):
    """Seller can see orders for their products (requires seller role)."""
    seller = crud.get_seller(db, seller_id=seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    if seller.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view orders for this seller")

    orders = crud.get_orders(db)
    seller_orders = []
    for order in orders:
        filtered_items = []
        for item in order.order_items:
            product = item.product
            if product and product.seller_id == seller_id:
                filtered_items.append(
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
        if filtered_items:
            seller_orders.append(
                schemas.OrderDetail(
                    id=order.id,
                    user_id=order.user_id,
                    total_amount=order.total_amount,
                    discount_amount=order.discount_amount,
                    final_amount=order.final_amount,
                    coupon_code=order.coupon_code,
                    status=order.status,
                    shipping_address=order.shipping_address,
                    created_at=order.created_at,
                    updated_at=order.updated_at,
                    order_items=filtered_items,
                )
            )

    return seller_orders


@router.put("/{order_id}", response_model=schemas.Order)
def update_order(order_id: int, order: schemas.OrderUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update an order's details (requires authentication)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role == RoleEnum.ADMIN:
        return crud.update_order(db, order_id=order_id, order=order)
    
    if current_user.role in {RoleEnum.USER, RoleEnum.BUYER, RoleEnum.BOTH} and db_order.user_id == current_user.id:
        return crud.update_order(db, order_id=order_id, order=order)
    
    raise HTTPException(status_code=403, detail="Not authorized to update this order")


@router.put("/{order_id}/status/{status}", response_model=schemas.Order)
def update_order_status(order_id: int, status: str, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Update order status (requires admin role)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        updated_order = crud.update_order_status(db, order_id=order_id, status=status)
        return updated_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{order_id}/mark-confirmed", response_model=schemas.Order)
def mark_order_confirmed(order_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark order as confirmed (requires admin role)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        updated_order = crud.update_order_status(db, order_id=order_id, status="confirmed")
        return updated_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/mark-preparing", response_model=schemas.Order)
def mark_order_preparing(order_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark order as preparing (requires admin role)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        updated_order = crud.update_order_status(db, order_id=order_id, status="preparing")
        return updated_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/mark-out-for-delivery", response_model=schemas.Order)
def mark_order_out_for_delivery(order_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark order as out for delivery (requires admin role)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        updated_order = crud.update_order_status(db, order_id=order_id, status="out_for_delivery")
        return updated_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/mark-delivered", response_model=schemas.Order)
def mark_order_delivered(order_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark order as delivered (requires admin role)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        updated_order = crud.mark_order_delivered(db, order_id=order_id)
        if db_order.payment_method == models.PaymentMethod.cod:
            db_order.payment_status = models.PaymentStatus.paid
            db.commit()
            db.refresh(db_order)
        return updated_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/mark-cancelled", response_model=schemas.Order)
def mark_order_cancelled(order_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Mark order as cancelled (requires admin role)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        updated_order = crud.mark_order_cancelled(db, order_id=order_id)
        return updated_order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{order_id}", response_model=schemas.Order)
def delete_order(order_id: int, current_user: models.User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    """Delete an order (requires admin role)"""
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return crud.delete_order(db, order_id=order_id)
