/**
 * Rotas de Usuários
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { logger } = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * GET /api/users
 * 
 * Lista todos os usuários (apenas ADMINISTRATIVO)
 */
router.get('/', requireRole('ADMINISTRATIVO'), (req, res) => {
  try {
    const db = getDatabase();
    
    db.all(
      'SELECT id, username, name, email, role, isActive, createdAt, updatedAt FROM users ORDER BY name',
      [],
      (err, users) => {
        if (err) {
          logger.error('Erro ao buscar usuários:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuários'
          });
        }
        
        const usersResponse = users.map(user => ({
          ...user,
          isActive: Boolean(user.isActive)
        }));
        
        res.json({
          success: true,
          users: usersResponse
        });
      }
    );
  } catch (error) {
    logger.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * GET /api/users/:id
 * 
 * Busca um usuário específico
 */
router.get('/:id', requireRole('ADMINISTRATIVO'), (req, res) => {
  try {
    const db = getDatabase();
    
    db.get(
      'SELECT id, username, name, email, role, isActive, createdAt, updatedAt FROM users WHERE id = ?',
      [req.params.id],
      (err, user) => {
        if (err) {
          logger.error('Erro ao buscar usuário:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuário'
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

/**
 * POST /api/users
 * 
 * Cria um novo usuário (apenas ADMINISTRATIVO)
 */
router.post('/', requireRole('ADMINISTRATIVO'), async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, senha, nome e role são obrigatórios'
      });
    }
    
    if (!['ADMINISTRATIVO', 'LOGISTICA'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role inválida. Use ADMINISTRATIVO ou LOGISTICA'
      });
    }
    
    const db = getDatabase();
    
    // Verificar se username já existe
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existingUser) => {
      if (err) {
        logger.error('Erro ao verificar usuário:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar usuário'
        });
      }
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username já está em uso'
        });
      }
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      
      // Inserir usuário
      db.run(
        'INSERT INTO users (id, username, password, name, email, role) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, hashedPassword, name, email || null, role],
        function(err) {
          if (err) {
            logger.error('Erro ao inserir usuário:', err);
            return res.status(500).json({
              success: false,
              message: 'Erro ao criar usuário'
            });
          }
          
          logger.info(`✅ Usuário criado: ${username} (${role})`);
          
          res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            user: {
              id: userId,
              username,
              name,
              email,
              role,
              isActive: true
            }
          });
        }
      );
    });
  } catch (error) {
    logger.error('Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * PUT /api/users/:id
 * 
 * Atualiza um usuário (apenas ADMINISTRATIVO)
 */
router.put('/:id', requireRole('ADMINISTRATIVO'), async (req, res) => {
  try {
    const { name, email, role, isActive, password } = req.body;
    const userId = req.params.id;
    
    const db = getDatabase();
    
    // Verificar se usuário existe
    db.get('SELECT id FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        logger.error('Erro ao verificar usuário:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar usuário'
        });
      }
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
      
      // Validar role se fornecida
      if (role && !['ADMINISTRATIVO', 'LOGISTICA'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role inválida. Use ADMINISTRATIVO ou LOGISTICA'
        });
      }
      
      // Montar query de atualização
      const updates = [];
      const values = [];
      
      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email);
      }
      if (role !== undefined) {
        updates.push('role = ?');
        values.push(role);
      }
      if (isActive !== undefined) {
        updates.push('isActive = ?');
        values.push(isActive ? 1 : 0);
      }
      if (password !== undefined) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push('password = ?');
        values.push(hashedPassword);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar'
        });
      }
      
      updates.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(userId);
      
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      
      db.run(query, values, function(err) {
        if (err) {
          logger.error('Erro ao atualizar usuário:', err);
          return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar usuário'
          });
        }
        
        logger.info(`✅ Usuário atualizado: ${userId}`);
        
        res.json({
          success: true,
          message: 'Usuário atualizado com sucesso'
        });
      });
    });
  } catch (error) {
    logger.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

/**
 * DELETE /api/users/:id
 * 
 * Remove um usuário (apenas ADMINISTRATIVO)
 */
router.delete('/:id', requireRole('ADMINISTRATIVO'), (req, res) => {
  try {
    const userId = req.params.id;
    
    // Não permitir deletar a si mesmo
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar seu próprio usuário'
      });
    }
    
    const db = getDatabase();
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        logger.error('Erro ao deletar usuário:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar usuário'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
      
      logger.info(`✅ Usuário deletado: ${userId}`);
      
      res.json({
        success: true,
        message: 'Usuário deletado com sucesso'
      });
    });
  } catch (error) {
    logger.error('Erro ao deletar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar requisição'
    });
  }
});

module.exports = router;






