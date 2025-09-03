package com.uniminuto.clinica.api;

import com.uniminuto.clinica.entity.Usuario;
import java.util.List;
import org.apache.coyote.BadRequestException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

/**
 *
 * @author lmora
 */
@CrossOrigin(origins = "*")
@RequestMapping("/usuario")
public interface UsuarioApi {

    @RequestMapping(value = "/listar",
            produces = {"application/json"},
            consumes = {"application/json"},
            method = RequestMethod.GET)
    ResponseEntity<List<Usuario>> listarUsuarios();
    
    
    
    @RequestMapping(value = "/listar-rol",
            produces = {"application/json"},
            consumes = {"application/json"},
            method = RequestMethod.GET)
    ResponseEntity<List<Usuario>> listarUsuariosPorRol(
       @RequestParam String rol
    );
    
    
    @RequestMapping(value = "/buscar-nombre",
            produces = {"application/json"},
            consumes = {"application/json"},
            method = RequestMethod.GET)
    ResponseEntity<Usuario> buscarUsuarioPorNombre(
       @RequestParam String nombre
    ) throws BadRequestException;
    
    
    
    @RequestMapping(value = "/buscar-estado",
            produces = {"application/json"},
            consumes = {"application/json"},
            method = RequestMethod.GET)
    ResponseEntity<List<Usuario>> buscarUsuariosPorEstado(
       @RequestParam Integer activo
    ) throws BadRequestException;
}
