import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

export default function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array()[0];
  next(new ApiError(400, first.msg));
}
