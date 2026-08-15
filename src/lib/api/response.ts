/**
 * Standardized API response helpers for consistent API responses.
 * All API routes should use these helpers to ensure a uniform response structure.
 */

import { NextResponse } from 'next/server';
import type { ApiSuccessResponse, ApiErrorResponse } from '@/types';

type HttpStatus = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

/**
 * Create a success response
 */
export function success<T>(
  data: T,
  message?: string,
  status: HttpStatus = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message ?? null,
      errors: null,
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function error(
  message: string,
  status: HttpStatus = 400,
  errors: Record<string, string[]> | null = null
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      errors,
    },
    { status }
  );
}

/**
 * Create a validation error response
 */
export function validationError(
  errors: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message: 'Validation failed',
      errors,
    },
    { status: 422 }
  );
}

/**
 * Create a not found response
 */
export function notFound(
  resource: string = 'Resource'
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message: `${resource} not found`,
      errors: null,
    },
    { status: 404 }
  );
}

/**
 * Create an unauthorized response
 */
export function unauthorized(
  message: string = 'Authentication required'
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      errors: null,
    },
    { status: 401 }
  );
}

/**
 * Create a forbidden response
 */
export function forbidden(
  message: string = 'You do not have permission to perform this action'
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      errors: null,
    },
    { status: 403 }
  );
}
