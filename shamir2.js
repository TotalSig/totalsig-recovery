class ShamirSecretSharing {
    constructor(secret, threshold, numShares, prime) {
        this.secret = BigInt(secret);
        this.threshold = threshold;
        this.numShares = numShares;
        this.prime = BigInt(prime);
        this.coefficients = this.generateCoefficients(threshold - 1, this.secret, this.prime);
    }

    // Generate random coefficients for the polynomial
    generateCoefficients(degree, constantTerm, prime) {
        let coeffs = [constantTerm];
        for (let i = 1; i <= degree; i++) {
            coeffs.push(BigInt(Math.floor(Math.random() * Number(prime))));
        }
        return coeffs;
    }

    // Evaluate polynomial at a given x
    evaluatePolynomial(x) {
        let result = BigInt(0);
        for (let i = this.coefficients.length - 1; i >= 0; i--) {
            result = (result * BigInt(x) + this.coefficients[i]) % this.prime;
        }
        return result;
    }

    // Generate shares (x, y) pairs
    generateShares() {
        let shares = [];
        for (let i = 1; i <= this.numShares; i++) {
            shares.push([BigInt(i), this.evaluatePolynomial(BigInt(i))]);
        }
        return shares;
    }

    // Lagrange interpolation to reconstruct the secret
    static reconstructSecret(shares, prime) {
        let secret = BigInt(0);

        for (let i = 0; i < shares.length; i++) {
            let [x_i, y_i] = shares[i];
            let lagrangeCoeff = BigInt(1);

            for (let j = 0; j < shares.length; j++) {
                if (i !== j) {
                    let [x_j, _] = shares[j];
                    lagrangeCoeff = (lagrangeCoeff * x_j * ShamirSecretSharing.modInverse((x_j - x_i + prime) % prime, prime)) % prime;
                }
            }

            secret = (prime + secret + (y_i * lagrangeCoeff)) % prime;
        }

        return secret;
    }

    // Compute modular inverse using Extended Euclidean Algorithm
    static modInverse(a, prime) {
        let [t, newT] = [BigInt(0), BigInt(1)];
        let [r, newR] = [prime, a];

        while (newR !== BigInt(0)) {
            let quotient = r / newR;
            [t, newT] = [newT, t - quotient * newT];
            [r, newR] = [newR, r - quotient * newR];
        }

        if (r > BigInt(1)) throw new Error('a is not invertible');
        if (t < BigInt(0)) t = t + prime;

        return t;
    }
}

module.exports = ShamirSecretSharing;

// Scenario Implementation:

// const prime = 7237005577332262213973186563042994240857116359379907606001950938285454250989n;    // A prime number greater than any secret

// // Each party generates their own secret and splits it
// const partySecrets = [
//     BigInt('0x3a1fb3eaa6c6e1f4d4b2ec6fa7d3d17e09f87fbc182fc708e1c595ce52de03ac'), // Secrets from party 1
//     BigInt('0xc423677bc7e2e69b36c3d3f130d34547dc6af1648b33d874c7b83ea1f8e60414') // Secrets from party 2
// ];

// const commonSecretOrig = partySecrets.reduce((partialSum, a) => (partialSum + a) % prime, 0n);

// console.log('Common Secret original:', commonSecretOrig);

// const threshold = 2;   // Minimum number of shares to reconstruct each secret
// const numShares = 2;   // Total number of shares to generate for each secret

// let allShares = [];
// let combinedShares = {};

// // Each party generates their shares
// partySecrets.forEach((secret, index) => {
//     let sss = new ShamirSecretSharing(secret, threshold, numShares, prime);
//     let shares = sss.generateShares();
//     allShares.push(shares);
    
//     // Combine shares for each party index
//     shares.forEach(([x, y]) => {
//         if (!combinedShares[x]) {
//             combinedShares[x] = BigInt(0);
//         }
//         combinedShares[x] = (combinedShares[x] + y) % prime;
//     });
// });

// console.log('Combined Shares:', combinedShares);

// // Reconstruct the common secret using combined shares
// let combinedSharesArray = Object.keys(combinedShares).map(x => [BigInt(x), combinedShares[x]]);
// let commonSecret = ShamirSecretSharing.reconstructSecret(combinedSharesArray.slice(0, threshold), prime);

// console.log('Common Secret:', commonSecret.toString());
