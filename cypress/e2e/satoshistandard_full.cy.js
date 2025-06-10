// cypress/e2e/satoshistandard_full.cy.js

describe('Satoshi Standard dApp – Comprehensive E2E Test', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Displays Connect Wallet button initially and connects mock wallet correctly', () => {
    cy.contains('button', 'Connect Wallet')
      .should('exist')
      .and('be.visible')
      .and('not.be.disabled');

    cy.contains('button', 'Connect Wallet').click();

    cy.contains('Wallet connected (mock)').should('exist');
    cy.contains(/^Connected:/).should('exist');

    cy.contains(/0 SATSTD/).should('exist');
    cy.contains(/BTC Proof of Reserve: 1000000000000000000/).should('exist');
    cy.contains(/Total supply: 0/).should('exist');
    cy.contains(/Your mintable max: 1000000 SATSTD/).should('exist');
  });

  it('Mint workflow: invalid, max, valid, balance update', () => {
    cy.contains('button', 'Connect Wallet').click();
    cy.contains(/^Connected:/).should('exist');

    cy.get('input[aria-label="mint"]').should('exist');

    cy.get('input[aria-label="mint"]').clear().type('2000000');
    cy.contains('button', 'Mint').should('be.disabled');

    cy.contains('button', 'Max').click();
    cy.get('input[aria-label="mint"]')
      .invoke('val')
      .should('match', /^[1-9]\d*$/);

    cy.get('input[aria-label="mint"]').clear().type('1');
    cy.contains('button', 'Mint').should('not.be.disabled').click();

    cy.contains('Minted 1 SATSTD').should('exist');
    cy.get('input[aria-label="mint"]').should('have.value', '');

    cy.contains('1 SATSTD').should('exist');
    cy.contains(/Your mintable max: 999999 SATSTD/).should('exist');
  });

  it('Burn workflow: invalid, valid, balance update', () => {
    cy.contains('button', 'Connect Wallet').click();
    cy.get('input[aria-label="mint"]').clear().type('1');
    cy.contains('button', 'Mint').click();
    cy.contains('Minted 1 SATSTD').should('exist');
    cy.contains('1 SATSTD').should('exist');

    cy.get('input[aria-label="burn"]').clear().type('2');
    cy.contains('button', 'Burn').should('be.disabled');

    cy.get('input[aria-label="burn"]').clear().type('1');
    cy.contains('button', 'Burn').should('not.be.disabled').click();

    cy.contains('Burned 1 SATSTD').should('exist');
    cy.contains('0 SATSTD').should('exist');
    cy.contains(/Your mintable max: 1000000 SATSTD/).should('exist');
  });

  it('Set PoR workflow for owner: invalid input, valid update, warning & progress check', () => {
    cy.contains('button', 'Connect Wallet').click();
    cy.contains(/^Connected:/).should('exist');

    cy.get('input[placeholder="e.g. 1000000"]').should('exist');

    cy.get('input[placeholder="e.g. 1000000"]').clear().type('-1');
    cy.contains('button', 'Set').should('be.disabled');

    cy.get('input[placeholder="e.g. 1000000"]').clear().type('10');
    cy.contains('button', 'Set').should('not.be.disabled').click();

    cy.contains('PoR backing updated.').should('exist');
    cy.get('input[placeholder="e.g. 1000000"]').should('have.value', '');

    cy.contains(/BTC Proof of Reserve: 10/).should('exist');
    cy.contains(/Your mintable max: 10 SATSTD/).should('exist');

    cy.get('input[aria-label="mint"]').clear().type('10');
    cy.contains('button', 'Mint').should('not.be.disabled').click();
    cy.contains('Minted 10 SATSTD').should('exist');
    cy.contains(/10 SATSTD/).should('exist');

    cy.wait(500);
    cy.contains('Warning: Reserve is almost depleted.').should('exist');

    // Progressbar should exist and have the correct data-tooltip attribute
    cy.get('[role="progressbar"]')
      .should('exist')
      .and('have.attr', 'data-tooltip', 'BTC reserve usage');
  });

  it('Disables controls when not connected or wrong network', () => {
    cy.reload();

    cy.contains('button', 'Connect Wallet').should('exist');

    // Mint and Burn inputs should not exist when not connected
    cy.get('input[aria-label="mint"]').should('not.exist');
    cy.get('input[aria-label="burn"]').should('not.exist');

    // Set Reserve input should not exist when not connected
    cy.get('input[placeholder="e.g. 1000000"]').should('not.exist');

    // Buttons Mint, Burn, Set should not exist
    cy.contains('button', 'Mint').should('not.exist');
    cy.contains('button', 'Burn').should('not.exist');
    cy.contains('button', 'Set').should('not.exist');
  });
});
