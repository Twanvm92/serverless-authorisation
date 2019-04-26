/**
 * Created by twanv on 21-4-2019.
 */
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Policy helper function
const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};



function getKey(header, callback){
  console.log("public key: ");
  client.getSigningKey(header.kid, function(err, key) {
    const signingKey = key.publicKey || key.rsaPublicKey;
    console.log("public key: " + signingKey);
    callback(null, signingKey);
  });
}

module.exports.auth = (event, context, callback) => {
    console.log('event', event);
    if (!event.authorizationToken) {
      return callback('Unauthorized');
    }

    const tokenParts = event.authorizationToken.split(' ');
    const tokenValue = tokenParts[1];

    if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
      // no auth token!
      return callback('Unauthorized');
    }
    const options = {
      audience: process.env.AUTH0_CLIENT_ID,
    };
    // Verify using getKey callback
    // Example uses https://github.com/auth0/node-jwks-rsa as a way to fetch the keys.



    try {
      let client, decoded, kid;

      client = jwksClient({
        jwksUri: 'https://dev-l38mnlmr.eu.auth0.com/.well-known/jwks.json'
      });

      decoded = jwt.decode(tokenValue, {complete: true});
      kid = decoded.header.kid;

      client.getSigningKey(kid, (err, key) => {
        if (err) {
          console.log("getSigningKey error:", err);
          callback(null, {policyDocument: generatePolicy(decoded.sub, 'Deny', event.methodArn)});
        } else {
          let signingKey = key.publicKey || key.rsaPublicKey;
          let options = {
            audience: process.env.AUDIENCE,
            issuer: process.env.TOKEN_ISSUER
          };

          jwt.verify(tokenValue, signingKey, options, (err, decoded) => {
            if (err) {
              console.log("jwt.verify error:", err);
              callback(null, {policyDocument: generatePolicy(decoded.sub, 'Deny', event.methodArn)});
            } else {
              console.log("Authorized!");
              // TODO one mistake here
              callback(null, {principalId: decoded.sub, policyDocument: generatePolicy(decoded.sub, 'Allow', event.methodArn), context: {scope: decoded.scope}});
            }
          });

        }
      });

      // jwt.verify(tokenValue, getKey, options, (verifyError, decoded) => {
      //   if (verifyError) {
      //     console.log('verifyError', verifyError);
      //     // 401 Unauthorized
      //     console.log(`Token invalid. ${verifyError}`);
      //     return callback('Unauthorized');
      //   }
      //   // is custom authorizer function
      //   console.log('valid from customAuthorizer', decoded);
      //   return callback(null, generatePolicy(decoded.sub, 'Allow', event.methodArn));
      // });
    } catch (err) {
      console.log('catch error. Invalid token', err);
      return callback('Unauthorized');
    }
};
