/**
 * Rotas de Autenticação
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * 
 * Realiza autenticação do usuário e retorna token JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e senha são obrigatórios'
      });
    }
    
    const db = getDatabase();
    
    // Buscar usuário
    db.get(
      'SELECT * FROM users WHERE username = ? AND isActive = 1',
      [username],
      async (err, user) => {
        if (err) {
          logger.error('Erro ao buscar usuário:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao processar login'
          });
        }
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Credenciais inválidas'
          });
        }
        
        // Verificar senha
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message: 'Credenciais inválidas'
          });
        }
        
        // Gerar token JWT
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role
          },
          process.env.JWT_SECRET || 'default-secret-change-me',
          { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
        
        // Remover senha da resposta
        const { password: _, ...userWithoutPassword } = user;
        const userResponse = {
          ...userWithoutPassword,
          isActive: Boolean(user.isActive)
        };
        
        logger.info(`✅ Login realizado: ${username} (${user.role})`);
        
        res.json({
          success: true,
          message: 'Login realizado com sucesso',
          user: userResponse,
          token
        });
      }
    );
  } catch (error) {
    logger.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar login'
    });
  }
});

/**
 * GET /api/auth/me
 * 
 * Retorna informações do usuário autenticado
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDatabase();
    
    db.get(
      'SELECT id, username, name, email, role, isActive, createdAt, updatedAt FROM users WHERE id = ?',
      [req.user.id],
      (err, user) => {
        if (err) {
          logger.error('Erro ao buscar usuário:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar informações do usuário'
          });
        }
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
          });
        }
        
        res.json({
          success: true,
          user: {
            ...user,
            isActive: Boolean(user.isActive)
          }
        });
      }
    );
  } catch (error) {
    logger.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;







