package com.uniminuto.clinica.service;

import com.uniminuto.clinica.entity.Usuario;
import java.util.List;
import org.apache.coyote.BadRequestException;

/**
 *
 * @author lmora
 */
public interface UsuarioService {
  List<Usuario> listarTodosLosUsuarios();
  
  List<Usuario> encontrarPorRol(String rol);
  
  Usuario encontrarPorNombre(String nombreUsuario) throws BadRequestException;
  
  List<Usuario> buscarPorEstado(Integer estado);
}
