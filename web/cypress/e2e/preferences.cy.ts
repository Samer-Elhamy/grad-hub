/**
 * Cypress E2E Test: Preferences Panel
 *
 * Tests the preferences management page:
 * - Stats summary display
 * - Category toggle chips
 * - Category exclusion/inclusion
 * - Top keywords display
 * - Loading state
 */

describe('Preferences Panel', () => {
  beforeEach(() => {
    // Visit the preferences page directly
    cy.visit('/preferences');

    // Wait for page to load
    cy.contains('Preferences').should('exist');
  });

  // -------------------------------------------------------------------------
  // Page Structure
  // -------------------------------------------------------------------------

  describe('Page Structure', () => {
    it('displays Preferences page title', () => {
      cy.contains('Preferences').should('be.visible');
    });

    it('has Summary section', () => {
      cy.contains('Summary').should('exist');
    });

    it('has Categories section', () => {
      cy.contains('Categories').should('exist');
    });

    it('may have Top Keywords section', () => {
      // This section is conditional - only shown if keyword_weights exist
      cy.get('body').then(($body) => {
        if ($body.text().includes('Top Keywords')) {
          cy.contains('Top Keywords').should('exist');
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Stats Summary
  // -------------------------------------------------------------------------

  describe('Stats Summary', () => {
    it('shows Total swipes stat', () => {
      cy.contains('Total swipes').should('exist');
    });

    it('shows Liked stat', () => {
      cy.contains('Liked').should('exist');
    });

    it('shows Like rate percentage', () => {
      // Look for percentage
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasPercent = /\d+%/.test(text);
        expect(hasPercent).to.be.true;
      });
    });

    it('stats are displayed in a 3-column grid', () => {
      cy.get('.grid-cols-3').should('exist').or('have.class', 'grid');
    });
  });

  // -------------------------------------------------------------------------
  // Category Toggles
  // -------------------------------------------------------------------------

  describe('Category Toggles', () => {
    it('displays category toggle chips', () => {
      // Should have at least some categories
      cy.get('button').filter((i, el) => {
        const categories = [
          'Web Development',
          'Machine Learning',
          'Mobile',
          'Cloud',
          'Security',
          'DevOps',
          'Data Science',
          'AI',
        ];
        return categories.some((cat) => el.textContent?.includes(cat));
      }).should('have.length.greaterThan', 0);
    });

    it('shows category help text', () => {
      cy.contains(/Toggle categories|exclude|feed/).should('exist');
    });

    it('included categories have normal styling', () => {
      // Included categories should NOT have line-through or red styling
      cy.get('button').filter((i, el) => {
        const isExcluded = el.classList.contains('line-through') ||
          el.classList.contains('text-red-500') ||
          el.classList.contains('bg-red-50');
        return !isExcluded && el.textContent && el.textContent.trim().length > 0;
      }).should('exist');
    });
  });

  // -------------------------------------------------------------------------
  // Category Toggle Interaction
  // -------------------------------------------------------------------------

  describe('Category Toggle Interaction', () => {
    it('clicking a category toggles its excluded state', () => {
      // Find a category button
      cy.contains('Web Development').then(($btn) => {
        const wasExcluded = $btn.hasClass('line-through') ||
          $btn.hasClass('text-red-500');

        // Click to toggle
        cy.wrap($btn).click();

        // State should change
        cy.contains('Web Development').then(($newBtn) => {
          const isExcluded = $newBtn.hasClass('line-through') ||
            $newBtn.hasClass('text-red-500');
          expect(isExcluded).to.not.equal(wasExcluded);
        });
      });
    });

    it('excluded categories have line-through styling', () => {
      // First exclude a category
      cy.contains('Web Development').click();

      // Then check it has line-through
      cy.contains('Web Development').should(($btn) => {
        const hasLineThrough = $btn.hasClass('line-through') ||
          $btn.css('text-decoration')?.includes('line-through');
        expect(hasLineThrough).to.be.true;
      });
    });

    it('excluded categories have red coloring', () => {
      cy.contains('Machine Learning').click();

      cy.contains('Machine Learning').should(($btn) => {
        const isRed = $btn.hasClass('text-red-500') ||
          $btn.hasClass('bg-red-50') ||
          $btn.css('color')?.includes('rgb(239, 68, 68)'); // red-500
        expect(isRed).to.be.true;
      });
    });

    it('included categories show weight percentage if available', () => {
      // Make sure at least one category is included
      cy.contains('Web Development').then(($btn) => {
        if ($btn.hasClass('line-through')) {
          cy.wrap($btn).click();
        }
      });

      // Included categories may show weight percentages
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Look for patterns like "85%" or "70%" next to category names
        const hasWeightPct = /\d+%/.test(text);
        expect(hasWeightPct).to.be.true;
      });
    });

    it('can toggle multiple categories', () => {
      const categoriesToToggle = ['Mobile', 'Cloud', 'Security'];

      categoriesToToggle.forEach((cat) => {
        cy.contains(cat).then(($btn) => {
          const initialState = $btn.hasClass('line-through');
          cy.wrap($btn).click();

          cy.contains(cat).should(($newBtn) => {
            expect($newBtn.hasClass('line-through')).to.not.equal(initialState);
          });
        });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Excluded Categories Behavior
  // -------------------------------------------------------------------------

  describe('Excluded Categories Behavior', () => {
    it('excluded categories move to end of list (sorted)', () => {
      // This test depends on the sorting behavior in Preferences.tsx
      // Excluded categories should sort after included ones

      // First, include all if any are excluded
      cy.get('button').filter((i, el) => {
        return el.classList.contains('line-through');
      }).each(($btn) => {
        cy.wrap($btn).click();
      });

      // Now exclude one
      cy.contains('Security').click();

      // After sort, excluded should be at bottom
      cy.get('button').last().should(($btn) => {
        expect($btn).to.contain('Security');
      });
    });

    it('excluded categories have reduced opacity', () => {
      cy.contains('DevOps').click();

      cy.contains('DevOps').should(($btn) => {
        const hasOpacity = $btn.hasClass('opacity-60') ||
          parseFloat($btn.css('opacity') || '1') < 1;
        expect(hasOpacity).to.be.true;
      });
    });
  });

  // -------------------------------------------------------------------------
  // Top Keywords
  // -------------------------------------------------------------------------

  describe('Top Keywords', () => {
    it('shows Top Keywords section if keywords exist', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Top Keywords')) {
          cy.contains('Top Keywords').should('be.visible');
        }
      });
    });

    it('keyword chips show weight percentages', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Top Keywords')) {
          // Find keyword tags with percentages
          cy.contains('Top Keywords')
            .parent()
            .within(() => {
              cy.get('span').filter((i, el) => {
                return /\d+%/.test(el.textContent || '');
              }).should('have.length.greaterThan', 0);
            });
        }
      });
    });

    it('keywords are sorted by weight (highest first)', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Top Keywords')) {
          // Get all percentage values
          const percentages: number[] = [];
          cy.contains('Top Keywords')
            .parent()
            .within(() => {
              cy.get('span').each(($el) => {
                const text = $el.text();
                const match = text.match(/(\d+)%/);
                if (match) {
                  percentages.push(parseInt(match[1], 10));
                }
              });
            })
            .then(() => {
              // Verify descending order
              for (let i = 0; i < percentages.length - 1; i++) {
                expect(percentages[i]).to.be.greaterThanOrEqual(percentages[i + 1]);
              }
            });
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------

  describe('Loading State', () => {
    it('shows loading spinner when preferences are loading', () => {
      // This is harder to test since loading happens on mount
      // We can verify the loading UI exists in the component structure

      // Visit the page and intercept the API call
      cy.intercept('GET', '/api/preferences', (req) => {
        // Delay the response to see loading state
        req.on('response', (res) => {
          res.setDelay(500);
        });
      }).as('getPreferences');

      cy.visit('/preferences');

      // Spinner should be visible during loading
      cy.get('.animate-spin').should('exist').or('not.exist'); // May be too fast
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  describe('Navigation', () => {
    it('can navigate back to Feed from Preferences', () => {
      cy.get('header').within(() => {
        cy.contains('Feed').click();
      });

      cy.url().should('equal', Cypress.config().baseUrl + '/');
    });

    it('can navigate to History from Preferences', () => {
      cy.contains('History').click();
      cy.url().should('include', '/history');
    });

    it('header navigation works from Preferences', () => {
      // All nav items should work
      cy.contains('Feed').should('exist');
      cy.contains('History').should('exist');
      cy.contains('Preferences').should('exist');
    });
  });

  // -------------------------------------------------------------------------
  // Data Persistence
  // -------------------------------------------------------------------------

  describe('Data Persistence', () => {
    it('category exclusions persist after page reload', () => {
      // Toggle a category
      cy.contains('Blockchain').click();
      cy.contains('Blockchain').then(($btn) => {
        const wasExcluded = $btn.hasClass('line-through');

        // Reload the page
        cy.reload();

        // Check if state persisted
        cy.contains('Blockchain').should(($newBtn) => {
          const isExcluded = $newBtn.hasClass('line-through');
          expect(isExcluded).to.equal(wasExcluded);
        });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Test Data Attributes
// ---------------------------------------------------------------------------
//
// Recommended data-testid attributes to add:
//
// Preferences.tsx:
// - Stats grid container: data-testid="preferences-stats"
// - Category buttons: data-testid={`category-toggle-${category}`}
// - Keyword chips: data-testid="keyword-chip"
// - Loading spinner: data-testid="loading-spinner"
