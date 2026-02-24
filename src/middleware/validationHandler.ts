import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : undefined,
      message: err.msg,
      value: (err as any).value ?? undefined
    }));

    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg, // ⭐ Send first real error message
      errors: formattedErrors
    });
  }

  next();
};
