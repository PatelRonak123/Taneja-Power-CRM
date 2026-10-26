import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiError } from '../apiErrorNormalizer.js';

describe('API Error Normalization Tests (normalizeApiError)', () => {
  describe('1. String-valued error responses', () => {
    it('1.1 Preserves string-valued responseData.error descriptive message', () => {
      const error = {
        message: 'Request failed with status code 409',
        response: {
          status: 409,
          data: {
            success: false,
            error: 'Cannot activate AMC Contract: Equipment is already covered by active AMC Contract AMC/2026-27/0099.',
            code: 'OVERLAPPING_AMC_COVERAGE',
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(
        normalized.message,
        'Cannot activate AMC Contract: Equipment is already covered by active AMC Contract AMC/2026-27/0099.'
      );
      assert.equal(normalized.code, 'OVERLAPPING_AMC_COVERAGE');
      assert.equal(normalized.statusCode, 409);
    });

    it('1.2 Trims whitespace on string-valued error', () => {
      const error = {
        response: {
          status: 400,
          data: {
            success: false,
            error: '  Invalid parameter supplied  ',
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'Invalid parameter supplied');
      assert.equal(normalized.code, 'HTTP_400');
      assert.equal(normalized.statusCode, 400);
    });
  });

  describe('2. Object-valued error responses', () => {
    it('2.1 Extracts message and code from nested error object', () => {
      const error = {
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Quotation revision is required',
              details: [{ field: 'revisionId', message: 'Required' }],
            },
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'Quotation revision is required');
      assert.equal(normalized.code, 'VALIDATION_ERROR');
      assert.equal(normalized.statusCode, 400);
      assert.deepEqual(normalized.details, [{ field: 'revisionId', message: 'Required' }]);
    });
  });

  describe('3. Top-level message responses', () => {
    it('3.1 Uses top-level responseData.message', () => {
      const error = {
        message: 'Request failed with status code 403',
        response: {
          status: 403,
          data: {
            success: false,
            message: 'You do not have permission to perform this action.',
            code: 'FORBIDDEN',
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'You do not have permission to perform this action.');
      assert.equal(normalized.code, 'FORBIDDEN');
      assert.equal(normalized.statusCode, 403);
    });

    it('3.2 Prioritizes non-empty responseData.message over error field', () => {
      const error = {
        response: {
          status: 400,
          data: {
            success: false,
            message: 'Top-level explanatory message',
            error: 'Secondary error message',
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'Top-level explanatory message');
    });

    it('3.3 Falls through to error string if top-level message is whitespace-only', () => {
      const error = {
        response: {
          status: 400,
          data: {
            success: false,
            message: '   ',
            error: 'Valid error string',
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'Valid error string');
    });
  });

  describe('4. Missing or empty server messages fallback safely', () => {
    it('4.1 Falls back to Axios error.message when server response body is empty', () => {
      const error = {
        message: 'Request failed with status code 502',
        response: {
          status: 502,
          data: null,
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'Request failed with status code 502');
      assert.equal(normalized.code, 'HTTP_502');
      assert.equal(normalized.statusCode, 502);
    });

    it('4.2 Falls back to default message when both server data and Axios error message are empty', () => {
      const error = {
        message: '   ',
        response: undefined,
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'An unexpected error occurred');
      assert.equal(normalized.code, 'NETWORK_ERROR');
      assert.equal(normalized.statusCode, undefined);
    });

    it('4.3 Handles non-object response data (e.g., HTML error page string) safely', () => {
      const error = {
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          data: '<html><body>Internal Server Error</body></html>',
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'Request failed with status code 500');
      assert.equal(normalized.code, 'HTTP_500');
      assert.equal(normalized.statusCode, 500);
    });
  });

  describe('5. Metadata, Status Code, and Details Preservation', () => {
    it('5.1 Preserves top-level details and code when error is a string', () => {
      const detailsObj = { conflictsWithId: 'contract-999', field: 'equipmentId' };
      const error = {
        response: {
          status: 409,
          data: {
            success: false,
            error: 'Equipment conflict',
            code: 'CONFLICT',
            details: detailsObj,
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.message, 'Equipment conflict');
      assert.equal(normalized.code, 'CONFLICT');
      assert.equal(normalized.statusCode, 409);
      assert.deepEqual(normalized.details, detailsObj);
    });

    it('5.2 Generates HTTP_ status code when code is missing from responseData', () => {
      const error = {
        response: {
          status: 404,
          data: {
            message: 'Contract not found',
          },
        },
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.code, 'HTTP_404');
    });

    it('5.3 Generates NETWORK_ERROR when status is absent (e.g., timeout or offline)', () => {
      const error = {
        message: 'Network Error: Connection refused',
      };

      const normalized = normalizeApiError(error);
      assert.equal(normalized.code, 'NETWORK_ERROR');
      assert.equal(normalized.message, 'Network Error: Connection refused');
      assert.equal(normalized.statusCode, undefined);
    });
  });
});
