describe('Satoshi Standard DApp – Full E2E functionality (Mock Wallet)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Displays PoR reserve value on screen', () => {
    cy.get('[data-testid="message-box"]').should('exist');
    cy.get('[data-testid="por-value"]').should('exist');
  });

  it('Recognizes owner and displays Set PoR interface', () => {
    cy.get('[data-testid="por-label"]').should('exist');
  });

  it('Sets PoR reserve to a new value', () => {
    cy.get('[data-testid="por-input"]').clear().type('50000000');
    cy.get('[data-testid="por-submit"]').click();
    cy.contains('Proof-of-Reserve value updated').should('exist');
  });

  it('Mints SATSTD tokens (if within PoR limit)', () => {
    cy.get('[data-testid="mint-input"]').clear().type('0.5');
    cy.get('[data-testid="mint-submit"]').click();
    cy.contains('Minted successfully').should('exist');
  });

  it('Prevents minting if PoR is too low', () => {
    cy.get('[data-testid="por-input"]').clear().type('1000');
    cy.get('[data-testid="por-submit"]').click();
    cy.get('[data-testid="mint-input"]').clear().type('1');
    cy.get('[data-testid="mint-submit"]').click();
    cy.contains('Minting amount exceeds BTC backing').should('exist');
  });

  it('Redeems (burns) SATSTD tokens', () => {
    cy.get('[data-testid="redeem-input"]').clear().type('0.1');
    cy.get('[data-testid="redeem-submit"]').click();
    cy.contains('Redeemed successfully').should('exist');
  });
});
