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