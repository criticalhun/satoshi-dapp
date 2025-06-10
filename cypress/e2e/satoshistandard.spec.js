// cypress/e2e/satoshistandard.spec.js

describe('Satoshi Standard dApp E2E', () => {
  before(() => {
    // Lépj be Metamask-kal és legyen mock balance (ehhez használj cypress-metamask plugint vagy teszt walletet)
    cy.visit('http://localhost:3000');
    cy.wait(2000);
  });

  it('Connects wallet and displays balance', () => {
    cy.contains('Connect Wallet').click();
    cy.contains('Wallet connected', { timeout: 10000 }).should('be.visible');
    cy.get('p').contains('Connected:').should('be.visible');
    cy.get('p').contains(/SATSTD/).should('exist');
    cy.contains('BTC Proof of Reserve').should('exist');
    cy.contains('Your mintable max:').should('exist');
  });

  it('Mints tokens up to the reserve', () => {
    // Mint max
    cy.contains('Max').click();
    cy.get('input[aria-label="mint"]').invoke('val').then(val => {
      cy.get('button').contains('Mint').should('not.be.disabled');
      cy.get('button').contains('Mint').click();
      cy.contains(`Minted ${val} SATSTD`, { timeout: 10000 }).should('be.visible');
      cy.wait(2000);
      cy.get('input[aria-label="mint"]').should('have.value', '');
    });
  });

  it('Cannot mint more than reserve', () => {
    cy.get('input[aria-label="mint"]').clear().type('1000000');
    cy.get('button').contains('Mint').should('be.disabled');
    cy.contains('Not enough BTC reserve').should('be.visible');
  });

  it('Burn button disables if not enough tokens', () => {
    cy.get('input[aria-label="burn"]').clear().type('1000000');
    cy.get('button').contains('Burn').should('be.disabled');
    cy.contains('Insufficient token balance').should('be.visible');
  });

  it('Burns tokens', () => {
    // Burn 0.01 if balance > 0.01
    cy.get('p').contains(/SATSTD/).invoke('text').then(txt => {
      const bal = parseFloat(txt);
      if (bal > 0.01) {
        cy.get('input[aria-label="burn"]').clear().type('0.01');
        cy.get('button').contains('Burn').should('not.be.disabled');
        cy.get('button').contains('Burn').click();
        cy.contains('Burned 0.01 SATSTD', { timeout: 10000 }).should('be.visible');
        cy.wait(2000);
      }
    });
  });

  it('Owner can set reserve if value is valid', () => {
    cy.get('input[placeholder="e.g. 1000000"]').clear().type('100');
    cy.get('button').contains('Set').should('be.disabled');
    cy.get('input[placeholder="e.g. 1000000"]').clear().type('100000000');
    cy.get('button').contains('Set').should('not.be.disabled');
    cy.get('button').contains('Set').click();
    cy.contains('PoR backing updated.', { timeout: 10000 }).should('be.visible');
  });

  it('Set reserve disables on invalid input', () => {
    cy.get('input[placeholder="e.g. 1000000"]').clear().type('1');
    cy.get('button').contains('Set').should('be.disabled');
    cy.contains('Reserve cannot be set below current total supply').should('be.visible');
  });

  it('Shows reserve warning and progress bar when supply is close to reserve', () => {
    // Set reserve very close to totalSupply
    cy.get('p').contains('Total supply:').invoke('text').then(txt => {
      const supply = txt.match(/[\d.]+/)[0];
      const near = (parseFloat(supply) * 1.01).toFixed(2);
      cy.get('input[placeholder="e.g. 1000000"]').clear().type(near);
      cy.get('button').contains('Set').should('not.be.disabled');
      cy.get('button').contains('Set').click();
      cy.contains('PoR backing updated.', { timeout: 10000 }).should('be.visible');
      cy.contains('Warning: Reserve is almost depleted').should('be.visible');
      cy.get('div').contains(/Reserve usage:/).should('exist');
    });
  });

  it('Tooltip works', () => {
    cy.get('label').contains('Mint Amount').trigger('mouseover');
    cy.contains('You can only mint up to the remaining reserve.').should('exist');
  });
});