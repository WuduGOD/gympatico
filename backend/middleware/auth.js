const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Brak tokenu autoryzacji! Zaloguj się." });
  }

  // Czyste przekazanie zmiennej z procesu bez fallbacku stringa
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedData) => {
    if (err) {
      return res.status(403).json({ error: "Token jest nieważny lub wygasł!" });
    }
    req.user = decodedData;
    next();
  });
};

module.exports = authenticateToken;