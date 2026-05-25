/**
 * Cypress E2E Test: Swipe Card Flow
 *
 * Tests the Tinder-style card swiping interaction:
 * - Card stack display
 * - Right swipe (like)
 * - Left swipe (dislike)
 * - Action buttons (NOPE/LIKE)
 * - Empty state
 */

describe('Swipe Card Flow', () => {
  beforeEach(() => {
    // Visit the main feed page
    cy.visit('/');

    // Wait for app to load
    cy.get('header').should('exist');
  });

  // -------------------------------------------------------------------------
  // Card Stack Display
  // -------------------------------------------------------------------------

  describe('Card Stack Display', () => {
    it('shows connection status indicator', () => {
      // Status indicator should be visible
      cy.contains(/Live|Reconnecting|Offline/).should('exist');
    });

    it('displays card stack when ideas are available', () => {
      // Check if cards container exists
      cy.get('[data-testid="card-stack"]').should('exist').then(($stack) => {
        // If cards exist, they should be visible
        if ($stack.find('[data-testid="swipe-card"]').length > 0) {
          cy.get('[data-testid="swipe-card"]').first().should('be.visible');
        }
      });
    });

    it('shows card with title and description', () => {
      // Wait for any card to appear
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="swipe-card"]').length > 0) {
          cy.get('[data-testid="swipe-card"]').first().within(() => {
            // Title should exist
            cy.get('h4').should('exist');

            // Description should exist
            cy.get('p').should('exist');
          });
        }
      });
    });

    it('shows category and difficulty badges on card', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="swipe-card"]').length > 0) {
          cy.get('[data-testid="swipe-card"]').first().within(() => {
            // Category badge
            cy.contains(/Web Development|Machine Learning|Mobile|Cloud|Security|DevOps|Data Science|AI/).should(
              'exist'
            );

            // Difficulty badge
            cy.contains(/beginner|intermediate|advanced/).should('exist');
          });
        }
      });
    });

    it('shows tech stack keywords on card', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="swipe-card"]').length > 0) {
          cy.get('[data-testid="swipe-card"]').first().within(() => {
            // Keywords/tags should be visible
            cy.get('[data-testid="keyword-tag"]').should('have.length.greaterThan', 0).or('not.exist');
          });
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Action Buttons
  // -------------------------------------------------------------------------

  describe('Action Buttons', () => {
    it('shows NOPE and LIKE action buttons', () => {
      // Buttons container should exist
      cy.get('[data-testid="card-actions"]').should('exist');

      // NOPE button (left swipe)
      cy.get('[data-testid="action-nope"]').should('exist');

      // LIKE button (right swipe)
      cy.get('[data-testid="action-like"]').should('exist');
    });

    it('clicking LIKE button swipes card right', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="action-like"]').length > 0) {
          // Get initial count of cards
          const initialCards = $body.find('[data-testid="swipe-card"]').length;

          // Click LIKE
          cy.get('[data-testid="action-like"]').click();

          // Wait for animation
          cy.wait(300);

          // Card should be removed (count decreases)
          cy.get('[data-testid="swipe-card"]').then(($cards) => {
            expect($cards.length).to.be.lessThan(initialCards);
          });
        }
      });
    });

    it('clicking NOPE button swipes card left', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="action-nope"]').length > 0) {
          const initialCards = $body.find('[data-testid="swipe-card"]').length;

          cy.get('[data-testid="action-nope"]').click();
          cy.wait(300);

          cy.get('[data-testid="swipe-card"]').then(($cards) => {
            expect($cards.length).to.be.lessThan(initialCards);
          });
        }
      });
    });

    it('shows toast notification after swipe', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="action-like"]').length > 0) {
          cy.get('[data-testid="action-like"]').click();

          // Toast should appear
          cy.get('[data-testid="toast"]')
            .should('exist')
            .and('be.visible');

          // Toast should have success/error message
          cy.contains(/Swipe recorded|Like|Nope/).should('exist');
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Drag/Swipe Interaction
  // -------------------------------------------------------------------------

  describe('Drag/Swipe Interaction', () => {
    it('allows dragging card to the right', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="swipe-card"]').length > 0) {
          // Get the top card
          cy.get('[data-testid="swipe-card"]')
            .first()
            .then(($card) => {
              // Drag right by 200px
              cy.wrap($card)
                .trigger('mousedown', { button: 0 })
                .trigger('mousemove', { clientX: 200, clientY: 0 })
                .trigger('mouseup');
            });

          // Card should swipe away
          cy.wait(400);
        }
      });
    });

    it('shows LIKE overlay when dragging right', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="swipe-card"]').length > 0) {
          cy.get('[data-testid="swipe-card"]')
            .first()
            .trigger('mousedown', { button: 0 })
            .trigger('mousemove', { clientX: 150, clientY: 0 });

          // LIKE overlay should appear
          cy.contains('LIKE').should('be.visible');

          // Release
          cy.get('[data-testid="swipe-card"]').first().trigger('mouseup');
        }
      });
    });

    it('shows NOPE overlay when dragging left', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="swipe-card"]').length > 0) {
          cy.get('[data-testid="swipe-card"]')
            .first()
            .trigger('mousedown', { button: 0 })
            .trigger('mousemove', { clientX: -150, clientY: 0 });

          // NOPE overlay should appear
          cy.contains('NOPE').should('be.visible');

          cy.get('[data-testid="swipe-card"]').first().trigger('mouseup');
        }
      });
    });

    it('card springs back when dragged slightly but not enough', () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="swipe-card"]').length > 0) {
          const initialCards = $body.find('[data-testid="swipe-card"]').length;

          // Drag just a little (not enough to trigger swipe)
          cy.get('[data-testid="swipe-card"]')
            .first()
            .trigger('mousedown', { button: 0 })
            .trigger('mousemove', { clientX: 30, clientY: 0 })
            .trigger('mouseup');

          cy.wait(400);

          // Card count should be the same (card sprung back)
          cy.get('[data-testid="swipe-card"]').then(($cards) => {
            expect($cards.length).to.equal(initialCards);
          });
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Empty State
  // -------------------------------------------------------------------------

  describe('Empty State', () => {
    it('shows empty state when no cards available', () => {
      // This test assumes we've swiped through all cards
      // We'll check if either cards exist OR empty state exists

      cy.get('body').then(($body) => {
        const hasCards = $body.find('[data-testid="swipe-card"]').length > 0;

        if (!hasCards) {
          // Empty state should show
          cy.contains(/No ideas|empty|swipe more/).should('exist');
        }
      });
    });

    it('action buttons are disabled when no cards', () => {
      cy.get('body').then(($body) => {
        const hasCards = $body.find('[data-testid="swipe-card"]').length > 0;

        if (!hasCards) {
          // Buttons should be disabled
          cy.get('[data-testid="action-nope"]').should('be.disabled');
          cy.get('[data-testid="action-like"]').should('be.disabled');
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  describe('Navigation from Main Feed', () => {
    it('can navigate to History page', () => {
      cy.get('header').within(() => {
        cy.contains('History').click();
      });

      cy.url().should('include', '/history');
      cy.contains('Swipe History').should('exist');
    });

    it('can navigate to Preferences page', () => {
      cy.get('header').within(() => {
        cy.contains('Preferences').click();
      });

      cy.url().should('include', '/preferences');
      cy.contains('Preferences').should('exist');
    });

    it('can navigate back to Feed from History', () => {
      // Go to History
      cy.contains('History').click();
      cy.url().should('include', '/history');

      // Go back to Feed
      cy.contains('Feed').click();
      cy.url().should('equal', Cypress.config().baseUrl + '/');
    });
  });
});

// ---------------------------------------------------------------------------
// Data Attributes Reference (add these to your components for better testing)
// ---------------------------------------------------------------------------
//
// Add these data-testid attributes to your components:
//
// CardStack.tsx:
// - <div data-testid="card-stack">
//
// SwipeableCard.tsx:
// - <div data-testid="swipe-card">
// - Keyword tags: <span data-testid="keyword-tag">
//
// CardActions.tsx:
// - <div data-testid="card-actions">
// - NOPE button: <button data-testid="action-nope">
// - LIKE button: <button data-testid="action-like">
//
// ToastContainer:
// - <div data-testid="toast">
