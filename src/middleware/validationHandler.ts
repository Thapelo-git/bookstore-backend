import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: ValidationError) => {
      // Type-safe error formatting
      if (error.type === 'field') {
        return {
          field: error.path,
          message: error.msg,
          value: (error as any).value // Value might not always be available
        };
      }
      
      return {
        field: error.type,
        message: error.msg
      };
    });
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};