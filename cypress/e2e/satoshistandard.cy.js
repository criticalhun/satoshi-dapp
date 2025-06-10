// cypress/e2e/satoshistandard.cy.js

describe('Satoshi Standard dApp – Full E2E Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(300);

    cy.get('body').then($body => {
      if ($body.text().includes('Please switch to GoChain Testnet')) {
        cy.contains('Please switch to GoChain Testnet').should('exist');
        Cypress.currentTest.skip = true;
      } else {
        cy.contains('Connect Wallet', { timeout: 10000 }).should('exist').click();
        cy.contains(/^Connected:/, { timeout: 10000 }).should('exist');
        // Ensure mintable max is displayed before proceeding
        cy.contains(/Your mintable max:/, { timeout: 10000 }).should('exist');
      }
    });
  });

  it('Shows user balance, on-chain reserve, and disables/enables Mint/Burn/Set as expected', function () {
    if (Cypress.currentTest.skip) {
      cy.log('Not testnet - skipping test');
      return;
    }

    cy.contains(/^BTC Proof of Reserve:/).should('exist');
    cy.contains('SATSTD').should('exist');

    // Mint and Burn fields should exist and not be disabled right after connect
    cy.get('input[aria-label="mint"]').should('exist').and('not.be.disabled');
    cy.get('input[aria-label="burn"]').should('exist').and('not.be.disabled');
    // But Mint, Burn, Set buttons should start disabled until valid input
    cy.get('button').contains('Mint').should('exist').and('be.disabled');
    cy.get('button').contains('Burn').should('exist').and('be.disabled');
    cy.get('button').contains('Set').should('exist').and('be.disabled');

    // Enter value exceeding mintable max
    cy.get('input[aria-label="mint"]').clear().type('99999999999999');
    cy.get('button').contains('Mint').should('be.disabled');
    cy.contains(/Your mintable max:/).should('exist');

    // Click Max and ensure input receives a valid numeric value
    cy.get('button').contains('Max').click();
    cy.get('input[aria-label="mint"]').invoke('val').should('match', /^[1-9]\d*\.?\d*$/);

    // Mint 1 SATSTD successfully
    cy.get('input[aria-label="mint"]').clear().type('1');
    cy.get('button').contains('Mint').should('not.be.disabled').click();
    cy.contains(/Minted 1 SATSTD/).should('exist');
    cy.get('input[aria-label="mint"]').should('have.value', '');
    cy.contains('1 SATSTD').should('exist');

    // Attempt invalid burn
    cy.get('input[aria-label="burn"]').clear().type('2');
    cy.get('button').contains('Burn').should('be.disabled');
    // Burn valid amount
    cy.get('input[aria-label="burn"]').clear().type('1');
    cy.get('button').contains('Burn').should('not.be.disabled').click();
    cy.contains(/Burned 1 SATSTD/).should('exist');
    cy.contains('0 SATSTD').should('exist');

    // Enter invalid newBacking for Set
    cy.get('input[placeholder="e.g. 1000000"]').clear().type('-1');
    cy.get('button').contains('Set').should('be.disabled');
    // Enter valid newBacking
    cy.get('input[placeholder="e.g. 1000000"]').clear().type('10');
    cy.get('button').contains('Set').should('not.be.disabled').click();
    cy.contains('PoR backing updated').should('exist');
    cy.get('input[placeholder="e.g. 1000000"]').should('have.value', '');

    // Test warning after mint that depletes reserve
    cy.get('input[aria-label="mint"]').clear().type('10');
    cy.get('button').contains('Mint').should('not.be.disabled').click();
    cy.contains('Warning: Reserve is almost depleted').should('exist');

    // Progress bar and tooltip
    cy.get('[role="progressbar"]').should('exist').and('be.visible');
    cy.get('[data-tooltip]').trigger('mouseover', { force: true });
    cy.get('[data-tooltip]').invoke('attr', 'data-tooltip').should('exist');
  });

  it('Disables all controls when not connected or wrong network', () => {
    cy.visit('/');
    cy.wait(300);
    cy.get('body').then($body => {
      if ($body.text().includes('Please switch to GoChain Testnet')) {
        cy.contains('Please switch to GoChain Testnet').should('exist');
        cy.contains('button', 'Connect Wallet').should('not.exist');
      } else {
        cy.contains('Connect Wallet').should('exist');
        cy.get('button').contains('Mint').should('exist').and('be.disabled');
        cy.get('button').contains('Burn').should('exist').and('be.disabled');
        cy.get('button').contains('Set').should('exist').and('be.disabled');
        cy.get('input[aria-label="mint"]').should('exist').and('be.disabled');
        cy.get('input[aria-label="burn"]').should('exist').and('be.disabled');
      }
    });
  });

  it('Animates and resets state after success/failure actions', function () {
    if (Cypress.currentTest.skip) {
      cy.log('Not testnet - skipping animation test');
      return;
    }
    // Mint animation
    cy.get('input[aria-label="mint"]').clear().type('1');
    cy.get('button').contains('Mint').click();
    cy.get('.animate-pulse').should('exist');
    cy.contains(/Minted/).should('exist');

    // Burn disabled on invalid input
    cy.get('input[aria-label="burn"]').clear().type('10000');
    cy.get('button').contains('Burn').should('be.disabled');
  });
});
