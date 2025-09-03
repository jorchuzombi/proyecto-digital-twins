package com.uniminuto.clinica.service.impl;

import com.uniminuto.clinica.entity.Usuario;
import com.uniminuto.clinica.repository.UsuarioRepository;
import com.uniminuto.clinica.service.UsuarioService;
import java.util.List;
import java.util.Optional;
import org.apache.coyote.BadRequestException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 *
 * @author lmora
 */
@Service
public class UsuarioServiceImpl implements UsuarioService {
    
    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public List<Usuario> listarTodosLosUsuarios() {
        return this.usuarioRepository.findAll();
    }

    @Override
    public List<Usuario> encontrarPorRol(String rol) {
        return this.usuarioRepository.findByRol(rol);
    }

    @Override
    public Usuario encontrarPorNombre(String nombreUsuario) 
            throws BadRequestException {
        Optional<Usuario> optUser = this.usuarioRepository
                .findByUsername(nombreUsuario);
        if (!optUser.isPresent()) {
            throw new BadRequestException("No existe el usuario");
        }
        
        return optUser.get();
    }

    @Override
    public List<Usuario> buscarPorEstado(Integer estado) {
        boolean activo = estado == 1? true : false;
        return this.usuarioRepository.findByActivo(activo);
    }
    
}
