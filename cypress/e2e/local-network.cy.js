describe('Satoshi Standard dApp on Localhost (chainId 31337)', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // stuboljunk egy egyszerű ethereum providert Cypress alatt
        win.Cypress = true;
        win.ethereum = {
          chainId: '0x7a69',               // 0x7a69 = 31337
          request: ({ method, params }) => {
            if (method === 'eth_requestAccounts') {
              return Promise.resolve(['0x1234567890abcdef1234567890abcdef12345678']);
            }
            if (method === 'wallet_switchEthereumChain') {
              // tesztben csak sikeresen térjünk vissza
              return Promise.resolve(null);
            }
            return Promise.reject(`Unhandled method ${method}`);
          },
          on: () => {},                    // ne dobjon hibát, ha használja az App a .on-et
          removeListener: () => {}
        };
      }
    });
  });

  it('connects wallet and shows UI controls', () => {
    cy.contains('Connect Wallet').click();
    cy.contains('Connected: 0x1234567890abcdef1234567890abcdef12345678');
    cy.get('input[aria-label="mint"]').should('exist');
    cy.get('input[aria-label="burn"]').should('exist');
  });

  it('disables buttons when network is not allowed', () => {
    // először egy „rossz” chainId-vel
    cy.visit('/', {
      onBeforeLoad(win) {
        win.Cypress = true;
        win.ethereum = {
          chainId: '0x1',  // Mainnet
          request: () => Promise.resolve(),
          on: () => {},
          removeListener: () => {}
        };
      }
    });
    cy.contains('Please switch to Sepolia or Localhost network');
    cy.get('button').should('be.disabled');
  });
});