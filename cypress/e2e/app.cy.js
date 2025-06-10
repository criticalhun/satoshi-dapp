// cypress/e2e/app.cy.js

describe('Satoshi Standard dApp BTC logic test', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.Cypress = true;
        win.ethereum = {
          chainId: '0x7a69', // 31337
          request: ({ method }) => {
            if (method === 'eth_requestAccounts') {
              return Promise.resolve(['0x1234567890abcdef1234567890abcdef12345678']);
            }
            return Promise.resolve();
          },
          on: () => {},
          removeListener: () => {}
        };
      },
    });
  });

  it('displays Connect Wallet button on initial load', () => {
    cy.get('button').should('contain', 'Connect Wallet');
  });

  it('connects wallet and shows account + BTC-backed SATSTD balance', () => {
    cy.get('button').contains('Connect Wallet').click();
    cy.contains(
      'Connected: 0x1234567890abcdef1234567890abcdef12345678'
    );
    cy.contains('BTC Proof of Reserve: 5000000000');
  });

  it('allows owner to see and fill mint and burn fields', () => {
    cy.get('button').contains('Connect Wallet').click();
    cy.get('input[aria-label="mint"]').should('exist').type('1.2');
    cy.get('input[aria-label="burn"]').should('exist').type('0.3');
    cy.get('button').contains('Mint').should('not.be.disabled');
    cy.get('button').contains('Burn').should('not.be.disabled');
  });

  it('disables Mint and Burn buttons when input is empty', () => {
    cy.get('button').contains('Connect Wallet').click();
    cy.get('input[aria-label="mint"]').clear();
    cy.get('input[aria-label="burn"]').clear();
    cy.get('button').contains('Mint').should('be.disabled');
    cy.get('button').contains('Burn').should('be.disabled');
  });

  it('displays error message after mint fails', () => {
    cy.get('button').contains('Connect Wallet').click();
    cy.get('input[aria-label="mint"]').type('bad');
    cy.get('button').contains('Mint').click();
    cy.contains('Mint failed');
  });

  it('displays error message after burn fails', () => {
    cy.get('button').contains('Connect Wallet').click();
    cy.get('input[aria-label="burn"]').type('bad');
    cy.get('button').contains('Burn').click();
    cy.contains('Burn failed');
  });
});