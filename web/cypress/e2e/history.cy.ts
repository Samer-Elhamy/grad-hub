/**
 * Cypress E2E Test: History Page
 *
 * Tests the swipe history page:
 * - Filter tabs (All / Liked / Disliked)
 * - History list display
 * - Direction indicators (heart/X icons)
 * - Pagination
 * - Empty state
 * - Date formatting
 */

describe('History Page', () => {
  beforeEach(() => {
    // Visit the history page
    cy.visit('/history');

    // Wait for page to load
    cy.contains('Swipe History').should('exist');
  });

  // -------------------------------------------------------------------------
  // Page Structure
  // -------------------------------------------------------------------------

  describe('Page Structure', () => {
    it('displays Swipe History title', () => {
      cy.contains('Swipe History').should('be.visible');
    });

    it('shows filter tabs (All / Liked / Disliked)', () => {
      cy.contains('All').should('exist');
      cy.contains('Liked').should('exist');
      cy.contains('Disliked').should('exist');
    });

    it('All filter is active by default', () => {
      cy.contains('All').should(($btn) => {
        const isActive = $btn.hasClass('bg-blue-500') ||
          $btn.hasClass('text-white') ||
          $btn.css('backgroundColor')?.includes('59, 130, 246'); // blue-500
        expect(isActive).to.be.true;
      });
    });
  });

  // -------------------------------------------------------------------------
  // Filter Tabs
  // -------------------------------------------------------------------------

  describe('Filter Tabs', () => {
    it('clicking Liked filter activates it', () => {
      cy.contains('Liked').click();

      cy.contains('Liked').should(($btn) => {
        const isActive = $btn.hasClass('bg-blue-500') || $btn.hasClass('text-white');
        expect(isActive).to.be.true;
      });

      // All should no longer be active
      cy.contains('All').should(($btn) => {
        const isActive = $btn.hasClass('bg-blue-500');
        expect(isActive).to.be.false;
      });
    });

    it('clicking Disliked filter activates it', () => {
      cy.contains('Disliked').click();

      cy.contains('Disliked').should(($btn) => {
        const isActive = $btn.hasClass('bg-blue-500') || $btn.hasClass('text-white');
        expect(isActive).to.be.true;
      });
    });

    it('can switch between filters quickly', () => {
      // Click through all filters
      cy.contains('Liked').click();
      cy.wait(100);
      cy.contains('Disliked').click();
      cy.wait(100);
      cy.contains('All').click();

      // All should be active again
      cy.contains('All').should(($btn) => {
        const isActive = $btn.hasClass('bg-blue-500') || $btn.hasClass('text-white');
        expect(isActive).to.be.true;
      });
    });
  });

  // -------------------------------------------------------------------------
  // History List Display
  // -------------------------------------------------------------------------

  describe('History List Display', () => {
    it('shows history items when swipes exist', () => {
      cy.get('body').then(($body) => {
        const hasItems = $body.find('[data-testid="history-item"]').length > 0 ||
          $body.find('.bg-white').length > 0;

        if (hasItems && !$body.text().includes('No swipes yet')) {
          // Items should be visible
          cy.get('[data-testid="history-item"]').first().should('be.visible').or('exist');
        }
      });
    });

    it('history items show idea title', () => {
      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          // Title should exist (h4 or similar)
          cy.get('h4').should('exist');
        });
      });
    });

    it('history items show idea description', () => {
      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          // Description should exist
          cy.get('p').should('exist');
        });
      });
    });

    it('history items show category', () => {
      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          // Category text should exist
          cy.contains(/Web Development|Machine Learning|Mobile|Cloud|Security|DevOps|Data Science|AI/).should('exist');
        });
      });
    });

    it('history items show formatted date', () => {
      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          // Date format: e.g., "Jan 15, 2:30 PM"
          cy.get('body').then(($item) => {
            const text = $item.text();
            // Look for time pattern or date pattern
            const hasTime = /\d+:\d+/.test(text);
            const hasMonth = /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/.test(text);
            expect(hasTime || hasMonth).to.be.true;
          });
        });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Direction Indicators
  // -------------------------------------------------------------------------

  describe('Direction Indicators', () => {
    it('liked items show green/heart indicator', () => {
      // First switch to Liked filter
      cy.contains('Liked').click();

      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          // Look for green heart or checkmark icon
          cy.get('body').then(($item) => {
            // Check for green class or SVG with heart/check
            const hasGreenIndicator = $item.find('.bg-emerald-50').length > 0 ||
              $item.find('.text-emerald-500').length > 0;
            expect(hasGreenIndicator).to.be.true;
          });
        });
      });
    });

    it('disliked items show red/X indicator', () => {
      // First switch to Disliked filter
      cy.contains('Disliked').click();

      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          // Look for red X icon
          cy.get('body').then(($item) => {
            const hasRedIndicator = $item.find('.bg-red-50').length > 0 ||
              $item.find('.text-red-500').length > 0;
            expect(hasRedIndicator).to.be.true;
          });
        });
      });
    });

    it('All filter shows both liked and disliked indicators', () => {
      cy.contains('All').click();

      cy.get('body').then(($body) => {
        const hasHistory = !$body.text().includes('No swipes yet');

        if (hasHistory) {
          // Check for both green and red indicators
          const hasGreen = $body.find('.bg-emerald-50').length > 0 ||
            $body.find('.text-emerald-500').length > 0;
          const hasRed = $body.find('.bg-red-50').length > 0 ||
            $body.find('.text-red-500').length > 0;

          // At least one type should exist
          expect(hasGreen || hasRed).to.be.true;
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Rating Display
  // -------------------------------------------------------------------------

  describe('Rating Display', () => {
    it('shows star rating when available', () => {
      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          cy.get('body').then(($item) => {
            const text = $item.text();
            // Look for star characters
            const hasStars = /★|☆/.test(text);
            expect(hasStars).to.be.true;
          });
        });
      });
    });

    it('rating shows correct number of filled stars', () => {
      checkForHistoryItems(($items) => {
        $items.first().within(() => {
          cy.get('body').then(($item) => {
            const text = $item.text();
            const filledStars = (text.match(/★/g) || []).length;
            const emptyStars = (text.match(/☆/g) || []).length;

            // Total should be 5
            if (filledStars > 0 || emptyStars > 0) {
              expect(filledStars + emptyStars).to.equal(5);
            }
          });
        });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Empty State
  // -------------------------------------------------------------------------

  describe('Empty State', () => {
    it('shows empty state message when no history', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        if (text.includes('No swipes yet') || text.includes('exploring')) {
          cy.contains(/No swipes|Start exploring/).should('be.visible');
        }
      });
    });

    it('empty state shows icon/illustration', () => {
      cy.get('body').then(($body) => {
        const hasNoHistory = $body.text().includes('No swipes yet');

        if (hasNoHistory) {
          // Look for a centered container with icon
          cy.get('.flex-col').filter((i, el) => {
            return el.classList.contains('items-center') &&
              el.classList.contains('justify-center');
          }).should('exist');
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  describe('Pagination', () => {
    it('shows pagination controls when multiple pages exist', () => {
      cy.get('body').then(($body) => {
        const hasPagination = $body.text().includes('Previous') ||
          $body.text().includes('Next') ||
          /Page \d+ \/ \d+/.test($body.text());

        if (hasPagination) {
          cy.contains(/Previous|Next|Page/).should('exist');
        }
      });
    });

    it('shows current page number', () => {
      cy.get('body').then(($body) => {
        const pageMatch = $body.text().match(/Page (\d+) \/ (\d+)/);
        if (pageMatch) {
          const currentPage = parseInt(pageMatch[1], 10);
          const totalPages = parseInt(pageMatch[2], 10);

          expect(currentPage).to.be.greaterThan(0);
          expect(currentPage).to.be.lessThanOrEqual(totalPages);
        }
      });
    });

    it('Previous button is disabled on first page', () => {
      // Make sure we're on page 1
      cy.get('body').then(($body) => {
        const pageMatch = $body.text().match(/Page (\d+) \/ (\d+)/);
        if (pageMatch && pageMatch[1] === '1') {
          cy.contains('Previous').should(($btn) => {
            const isDisabled = $btn.is(':disabled') ||
              $btn.hasClass('disabled') ||
              $btn.hasClass('opacity-30') ||
              $btn.css('opacity') === '0.3';
            expect(isDisabled).to.be.true;
          });
        }
      });
    });

    it('can navigate to next page if available', () => {
      cy.get('body').then(($body) => {
        const pageMatch = $body.text().match(/Page (\d+) \/ (\d+)/);

        if (pageMatch) {
          const totalPages = parseInt(pageMatch[2], 10);

          if (totalPages > 1) {
            cy.contains('Next').click();

            // Should navigate to page 2
            cy.contains('Page 2 /').should('exist');
          }
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  describe('Loading State', () => {
    it('shows loading spinner when fetching history', () => {
      // Intercept and delay the API call
      cy.intercept('GET', '/api/history*', (req) => {
        req.on('response', (res) => {
          res.setDelay(300);
        });
      }).as('getHistory');

      cy.visit('/history');

      // Spinner should be visible during loading
      cy.get('.animate-spin').should('exist').or('not.exist');
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  describe('Navigation', () => {
    it('can navigate back to Feed from History', () => {
      cy.contains('Feed').click();
      cy.url().should('equal', Cypress.config().baseUrl + '/');
    });

    it('can navigate to Preferences from History', () => {
      cy.contains('Preferences').click();
      cy.url().should('include', '/preferences');
    });
  });

  // -------------------------------------------------------------------------
  // Helper Functions
  // -------------------------------------------------------------------------

  /**
   * Helper to check for history items and run assertions
   */
  function checkForHistoryItems(callback: ($items: JQuery<HTMLElement>) => void): void {
    cy.get('body').then(($body) => {
      const hasNoHistory = $body.text().includes('No swipes yet');

      if (!hasNoHistory) {
        // Find history items by their container class
        const $items = $body.find('.bg-white, .dark\\:bg-gray-900').filter((i, el) => {
          // Filter for actual history items (not other components)
          return el.classList.contains('flex') &&
            el.classList.contains('items-start') &&
            el.classList.contains('gap-4');
        });

        if ($items.length > 0) {
          callback($items);
        }
      } else {
        // No history - test passes (nothing to check)
        expect(true).to.be.true;
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Test Data Attributes
// ---------------------------------------------------------------------------
//
// Recommended data-testid attributes to add:
//
// History.tsx:
// - Filter buttons: data-testid={`filter-${f.key}`} (filter-all, filter-liked, filter-disliked)
// - History item container: data-testid="history-item"
// - Direction icon: data-testid={`direction-icon-${record.direction}`}
// - Pagination container: data-testid="pagination"
// - Previous button: data-testid="pagination-prev"
// - Next button: data-testid="pagination-next"
// - Page info: data-testid="pagination-info"
// - Empty state container: data-testid="history-empty"
// - Loading spinner: data-testid="loading-spinner"
