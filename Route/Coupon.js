const express = require('express');
const { body, param } = require('express-validator');
const {
  CreateCouponOffer,
  GetCouponById,
  GetAllCoupons,
  UpdateCoupon,
  DeleteCoupon,
  ApplyCoupon,
  GetAllCouponsbyoffer,
  GetCouponsByProperty
} = require('../Controller/Coupon'); // Using the same controller for both Coupon and CouponOffer

const CouponRouter = express.Router();


CouponRouter.post(
  '/CreateCoupon',
  CreateCouponOffer
);

CouponRouter.get(
  '/GetCouponById/:id',
  param('id').isMongoId().withMessage('Invalid coupon ID'),
  GetCouponById
);

CouponRouter.get(
  '/GetAllCoupons',
  GetAllCoupons
);
CouponRouter.get(
  '/GetAllCouponsbyoffer',
  GetAllCouponsbyoffer
);

CouponRouter.put(
  '/UpdateCoupon/:id',
  [
    param('id').isMongoId().withMessage('Invalid coupon ID'),
  ],
  UpdateCoupon
);

CouponRouter.delete(
  '/DeleteCoupon/:id',
  param('id').isMongoId().withMessage('Invalid coupon ID'),
  DeleteCoupon
);

// Apply Coupon or Coupon Offer
CouponRouter.post(
  '/ApplyCoupon',
  [
    body('couponCode').isString().withMessage('Coupon code must be a string').notEmpty().withMessage('Coupon code is required'),
  ],
  ApplyCoupon
);

CouponRouter.get("/property/:propertyId", GetCouponsByProperty);

// Validate Coupon or Coupon Offer by Code
// CouponRouter.get(
//   '/ValidateCoupon/:code',
//   param('code').isString().withMessage('Invalid coupon code format'),
//   ValidateCoupon
// );

module.exports = { CouponRouter };
