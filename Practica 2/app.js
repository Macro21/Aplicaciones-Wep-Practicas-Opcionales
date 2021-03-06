
"use strict";

const express = require("express");
const path = require("path");
const config = require("./config");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const passport = require("passport");
const passportHTTP = require("passport-http");
const underscore = require("underscore");
const expressValidator = require("express-validator");

const app = express();

const daoUsuarios = require("./dao/dao_usuarios");
const daoPartidas = require("./dao/dao_partidas");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(expressValidator());

const pool = mysql.createPool({
    host: config.mysqlConfig.host,
    user: config.mysqlConfig.user,
    password: config.mysqlConfig.password,
    database: config.mysqlConfig.database
});

const daoUsuario = new daoUsuarios.DAOUsuarios(pool);
const daoPartida = new daoPartidas.DAOPartidas(pool);


passport.use(new passportHTTP.BasicStrategy({ realm: 'Autenticacion requerida' },
    function (user, pass, callback) {
        daoUsuario.isUserCorrect(user,(err,userInfo)=>{
            if(err){
                callback(err);
                console.log(err);
            }
            if(userInfo.password === pass && user === userInfo.login){//comprueba que el usuario exista y que tenga esa contraseña
                callback(null, {id: userInfo.id });
            }
            else{
                callback(null, false);
            }
        });
    }
));

app.post("/login", (request, response)=>{
    let password = request.body.datosUsuario.password;
    let name = request.body.datosUsuario.user;
    request.checkBody("datosUsuario.user", "Nombre de usuario no vacio").notEmpty();
    request.checkBody("datosUsuario.user", "Nombre de usuario no válido").matches(/^[A-Z0-9]*$/i);
    request.checkBody("datosUsuario.password", "La contraseña no es válida").isLength({ min: 4, max: 10 });
    let errors = request.validationErrors();
    if (errors) {
        response.status(404);
        response.json({});
        
    }
    else{
        daoUsuario.isUserCorrect(name,(err,userInfo)=>{
            if(err){
                response.status(500);//internal server error
                response.end(err.message);
                console.log(err);
            }
            if(userInfo){// comprueba que el usuario exista y que tenga esa contraseña
                
                if(userInfo.password === password){
                    response.status(200);
                    response.json({usuarioCorrecto:true});
                }
                else{
                    response.json({usuarioCorrecto: false});
                }
            }
            else{
                response.status(401);
                response.json({usuarioCorrecto: false});
            }
        });
    }
});

app.post("/newUser", (request, response) => {
    let login = request.body.newUser.user;
    let pass = request.body.newUser.password;
    request.checkBody("newUser.user", "Nombre de usuario no vacio").notEmpty();
    request.checkBody("newUser.user", "Nombre de usuario no válido").matches(/^[A-Z0-9]*$/i);
    request.checkBody("newUser.password", "La contraseña no es válida").isLength({ min: 4, max: 10 });
    let errors = request.validationErrors();
    if (errors) {
        response.status(404);
        response.json({});
        
    }
    else{
        daoUsuario.existsUser(login, (err,exist)=>{
            if(err){
                response.status(500);
                console.log(err);
            }
            if(exist){
                response.status(400);//bad request
                response.json({});
            }
            else{
                daoUsuario.insertUser(login,pass, (err)=>{
                    if(err){
                        response.status(500);//internal server error
                        response.json({});
                    }
                    response.status(201);//created
                    response.json({});
                });
            }
        });
    }
});

app.get("/userGames",passport.authenticate('basic', {session: false}), (request, response) =>{
    
    daoUsuario.getGamesByUser(request.user.id, (err,result)=>{
        if(err){
            response.status(500);
            console.log(err);
        }
        response.status(200);
        response.json({games: result});
    });
});


/**
 * Estado de una partida. El servidor recibe el identi1cador de una partida y devuelve los nombres
    de los jugadores actualmente inscritos en la misma, o el código 404 en caso de no existir una
    partida con el identi1cador dado.
 */
app.get("/gameState/:gameId",passport.authenticate('basic', {session: false}),(request,response)=>{
    daoPartida.getState(request.user.id, request.params.gameId,(err,result)=>{
        if(err){
            response.status(500);
            console.log(err);
        }
        if(result.length === 0){
            response.status(404); //Not found
        }
        else{
            response.status(200);
            let infoJugadorActual=result.jugadoresCartas;
            for(let player of infoJugadorActual){
                let id=player.idJugador;
                if(id===request.user.id){
                    result.jugadoresCartas=player; //solo le devuelvo al cliente sus cartas
                }
            }
            result.mesaInfo.cartas=[]; //no le devuelvo al cliente las cartas de la mesa
            response.json({gameInfo: result});
        }
    });
});

app.post("/newGame", passport.authenticate('basic', {session: false}), (request,response)=>{
    let nombrePartida = request.body.nombrePartida;
    daoPartida.insertGame(nombrePartida,(err,gameId)=>{
        if(err){
            console.log(err);
            response.status(500);
        }
        daoUsuario.insertPlayerInGame(request.user.id, gameId, (err)=>{
            if(err){
                console.log(err);
                response.status(500);
            }
            let jugadorInfo = {
                nombre: request.body.user,
                idJugador: request.user.id,
                nrCartas: undefined
            };
            let jugadoresInfo = [];
            jugadoresInfo.push(jugadorInfo);
            let jugadorCartas = {
                idJugador: request.user.id,
                cartas: []
            };
            let jugadoresCartas = [];
            jugadoresCartas.push(jugadorCartas);
            let mesaInfo={
                supuestoValor: 0,
                nrCartas: 0,
                cartas:[]
            };
            let estado={
                idTurno: -1,
                idTurnoAnterior: -1,
                cartasUltimoJugador: [],
                mesaInfo: mesaInfo,
                jugadoresInfo: jugadoresInfo,
                jugadoresCartas: jugadoresCartas
            };   
            daoPartida.stateUpdate(gameId, JSON.stringify(estado), (err)=>{
                if(err){
                    console.log(err);
                    response.status(500);
                }
                response.status(201);
                response.json({gameId: gameId});
            });
        });
    });
});

//Incorporación a una partida.
app.post("/joinGame",passport.authenticate('basic', {session: false}),(request,response)=>{
   
    daoPartida.getGame(request.body.gameId,(err,infoGame)=>{
        if(err){
            console.log(err);
            response.status(500);
        }
        if(infoGame.length === 0){//si no existe la partida
            response.status(404); //Not found
        }
        else{
            daoPartida.getState(request.user.id,request.body.gameId, (err,estado)=>{
                if(err){
                    response.status(500);
                    response.json({});
                    console.log(err);
                }
                if(estado.jugadoresInfo.length === 4){
                    response.status(400);
                    response.json({});
                }
                else{
                    //si existe la partida y no se ha completado
                    daoUsuario.insertPlayerInGame(request.user.id,request.body.gameId,(err)=>{
                        if(err){
                            response.status(500);
                            console.log(err);
                        }
                        //Actualizar estado con nuevo jugador
                        let jugadorInfo = {
                            nombre: request.body.user,
                            idJugador: request.user.id,
                            nrCartas: undefined
                        };
                        let jugadorCartas={
                            idJugador:request.user.id,
                            cartas: []
                        };
                        estado.jugadoresInfo.push(jugadorInfo);
                        estado.jugadoresCartas.push(jugadorCartas);
                        daoPartida.stateUpdate(request.body.gameId, JSON.stringify(estado), (err)=>{
                            if(err){
                                console.log(err);
                                response.status(500);
                            }
                            if(estado.jugadoresInfo.length === 4){//El +1 es para que quede claro que son 4 jugadores al insertar el ultimo
                                iniciarPartida(request.body.gameId, request, response, infoGame);
                            }
                            else{
                                response.status(200);
                                response.json({nombrePartida: infoGame[0].nombre});
                            } 
                        });
                         
                    });
                }
            });
        }
    });
});

function iniciarPartida(gameId, request, response, infoGame){
    let baraja=["A_C","2_C","3_C","4_C","5_C","6_C","7_C","8_C","9_C","10_C","J_C","Q_C","K_C",
                "A_H","2_H","3_H","4_H","5_H","6_H","7_H","8_H","9_H","10_H","J_H","Q_H","K_H",
                "A_D","2_D","3_D","4_D","5_D","6_D","7_D","8_D","9_D","10_D","J_D","Q_D","K_D",
                "A_S","2_S","3_S","4_S","5_S","6_S","7_S","8_S","9_S","10_S","J_S","Q_S","K_S"];
    baraja= underscore.shuffle(baraja);
    //ESTRUCTURA DEL ESTADO:
    let jugadorInfo = {
        nombre: "",
        idJugador: -1,
        nrCartas: 13,
    };
    let jugadoresInfo = [];
    let jugadoresCartas=[];
    let jugadorCartas ={
        idJugador: -1,
        cartas:[]
    }
    let mesaInfo={
        supuestoValor: 0,
        nrCartas: 0,
        cartas:[]
    }
    let estado={
        idTurno: -1,
        idTurnoAnterior: -1,
        cartasUltimoJugador: [],
        mesaInfo: mesaInfo,
        jugadoresInfo: jugadoresInfo,
        jugadoresCartas:jugadoresCartas
    }   

    //Repartir las cartas
    daoPartida.getState(request.user.id,gameId, (err,estado)=>{
        if(err){
            response.status(500);
            response.json({});
            console.log(err);
        }
        //Repartir cartas
        for(let jugadorBD of estado.jugadoresInfo){
            jugadorInfo.nombre= jugadorBD.nombre;
            jugadorInfo.idJugador =jugadorBD.idJugador;
            jugadorCartas.idJugador = jugadorBD.idJugador;
            jugadorCartas.cartas= baraja.slice(0,13); //Reparto las 13 primeras
            baraja.splice(0,13); // borro las 13 primeras repartidas
            jugadoresInfo.push(jugadorInfo);
            jugadoresCartas.push(jugadorCartas);
            //Reinicio jugadorInfo
            jugadorInfo = new Object();
            jugadorInfo.nombre= "";
            jugadorInfo.idJugador= -1;
            jugadorInfo.nrCartas= 13;
            jugadorCartas = new Object();
            jugadorCartas.idJugador = -1;
            jugadorCartas.cartas= [];
        }
        //Añado los jugadores al estado.
        estado.jugadoresInfo=jugadoresInfo;
        estado.jugadoresCartas=jugadoresCartas;
        // Despues de mezclar los objetos del array,
        // me quedo con el primer jugador para que él empiece la partida
        jugadoresInfo = underscore.shuffle(jugadoresInfo);
        estado.idTurno=jugadoresInfo[0].idJugador;
        
        //Meterlas en la bd en estatus
        daoPartida.stateUpdate(gameId, JSON.stringify(estado), (err)=>{
            if(err){
                response.status(500);
                console.log(err);
            }
            response.status(200);
            response.json({nombrePartida: infoGame[0].nombre});
        }); 
    });
};

app.post("/accion",passport.authenticate('basic', {session: false}),(request,response)=>{
    let datos=request.body.datos;
    daoPartida.getState(request.user.id,datos.gameId, (err,estado)=>{
        if(err){
            response.status(500);
            response.json({});
            console.log(err);
        }
        let mentiroso=false; //lo delcaro aquí para despues enviar mensaje confirmando si mentia o no
        let idTurnoAnteriorBD = estado.idTurnoAnterior;//Turno anterior de bd para ver si ha ganado o no
        let nrCartasJugadas = true;
        
        if(datos.accion==="jugar"){ //Actualizo el estado
            if(datos.cartas.length > 3 || datos.cartas.length <= 0 || datos.cartasInicio=== undefined){
                nrCartasJugadas = false;
            }
            else{
                let pos = -1;
                for(let i=0;i<estado.jugadoresInfo.length;i++){
                    if(estado.jugadoresInfo[i].idJugador===request.user.id){
                        pos=i;
                        i= estado.jugadoresInfo.length;//Para salir del bucle
                    }
                }
                let turnoSiguiente=(pos+1)%4;
                estado.idTurno= estado.jugadoresInfo[turnoSiguiente].idJugador;
                estado.idTurnoAnterior = request.user.id;
                if(datos.cartasInicio!=="" && datos.cartasInicio!==estado.mesaInfo.supuestoValor){
                    estado.mesaInfo.supuestoValor = datos.cartasInicio;
                }
                estado.mesaInfo.nrCartas +=datos.cartas.length;
                //Sumo cartas a la mesa
                for(let i=0;i<datos.cartas.length;i++){
                    estado.mesaInfo.cartas.push(datos.cartas[i]);
                }
                //Meto cartas en atributo cartasUltimoJugador
                estado.cartasUltimoJugador= datos.cartas;
                //Resto cartas de la mano del jugador
                let cartasFinal=[];
                let distinta;
                let j=0;
                for(let i=0;i<estado.jugadoresCartas[pos].cartas.length;i++){
                    distinta=true;
                    j=0;
                    while(j<datos.cartas.length && distinta){
                        if(datos.cartas[j]===estado.jugadoresCartas[pos].cartas[i]){
                            distinta=false;
                        }
                        j++;
                    }
                    if(distinta){
                        cartasFinal.push(estado.jugadoresCartas[pos].cartas[i]);
                    }
                }
                estado.jugadoresCartas[pos].cartas= cartasFinal;
                estado.jugadoresInfo[pos].nrCartas=cartasFinal.length;
                estado.turno=false;
            }
        }
        else if(datos.accion==="mentiroso"){ //Accion == mentiroso
            //Hay que averiguar si miente el jugador anterior. 
            let i=0;
            //Parsear
            let parseadas = [];
            for (let i = 0; i <estado.cartasUltimoJugador.length; i++) {   
                let carta =estado.cartasUltimoJugador[i];
                if(carta[1]==="0"){ //Único caso en el que hay que coger 2 pos, no solo la primera
                    parseadas[i]=carta.slice(0,2);
                }
                else{
                    parseadas[i]=carta[0];
                }
            }
            while(i<parseadas.length && !mentiroso){
                if(parseadas[i]!==estado.mesaInfo.supuestoValor){
                    mentiroso=true;
                }
                i++;
            }
            let pos = -1;
            if(mentiroso){
                //Al mentir el ultimo jugador se lleva las cartas, por ello lo busco con el idTurnoAnterior
                for(let i=0;i<estado.jugadoresInfo.length;i++){
                    if(estado.jugadoresInfo[i].idJugador===estado.idTurnoAnterior){
                        pos=i;
                        i= estado.jugadoresInfo.length;//Para salir del bucle
                    }
                }
                estado.idTurnoAnterior = estado.idTurnoAnterior; //Se mantiene el mismo
            }
            else{
                //Al decir la verdad el usuario que ha levantado se lleva las cartas, por tanto busco por user.id
                for(let i=0;i<estado.jugadoresInfo.length;i++){
                    if(estado.jugadoresInfo[i].idJugador===request.user.id){
                        pos=i;
                        i= estado.jugadoresInfo.length; //Para salir del bucle
                    }
                }
                estado.idTurnoAnterior = request.user.id; //Al decir la verdad, el turno me salta y yo soy el anterior.
            }
            let turnoSiguiente=(pos+1)%4;//el turno es del siguiente al que recoge las cartas
            estado.idTurno= estado.jugadoresInfo[turnoSiguiente].idJugador; 
            
            //Sumo cartas al jugador
            for(let i=0;i<estado.mesaInfo.cartas.length;i++){
                estado.jugadoresCartas[pos].cartas.push(estado.mesaInfo.cartas[i]);
            }
            estado.jugadoresInfo[pos].nrCartas +=estado.mesaInfo.cartas.length;
            //Borro cartas de la mesa:
            estado.mesaInfo.nrCartas= 0;
            estado.mesaInfo.cartas= [];
            estado.mesaInfo.supuestoValor = "";
            //Borro cartas en atributo cartasUltimoJugador
            estado.cartasUltimoJugador= [];
            estado.turno=false;
        }
        else{ //Acción === "descartar"
            let pos = -1;
            for(let i=0;i<estado.jugadoresInfo.length;i++){
                if(estado.jugadoresInfo[i].idJugador===request.user.id){
                    pos=i;
                    i= estado.jugadoresInfo.length;//Para salir del bucle
                }
            }
            let copiaCartasJugador = estado.jugadoresCartas[pos].cartas;
            copiaCartasJugador.sort();            
            let contador=0;
            for (let i=0;i<copiaCartasJugador.length-4;i++){
                for(let j=i+1;j<i+4;j++){
                    //Parseo
                    let carta1=copiaCartasJugador[i];
                    if(carta1[1]==="0"){ //Único caso en el que hay que coger 2 pos, no solo la primera
                        carta1=carta1.slice(0,2);
                    }
                    else{
                        carta1=carta1[0];
                    }
                    let carta2=copiaCartasJugador[j];
                    if(carta2[1]==="0"){ //Único caso en el que hay que coger 2 pos, no solo la primera
                        carta2=carta2.slice(0,2);
                    }
                    else{
                        carta2=carta2[0];
                    }
                    //Comparo
                    if(carta1 === carta2){
                        contador ++;
                    }
                }
                if(contador===3){
                    //Cortar
                    copiaCartasJugador.splice(i,4);
                }
                contador=0;
            }
        }
        //COMPROBAR SI ALGUIEN HA GANADO
        //busco el del turno anterior en jugadoresInfo para ver su nrCartas
        let pos = 0;
        for(let i=0;i<estado.jugadoresInfo.length;i++){
            if(estado.jugadoresInfo[i].idJugador===idTurnoAnteriorBD){
                pos=i;
                i= estado.jugadoresInfo.length; //Para salir del bucle
            }
        }
        //Comprobar NrCartas
        if(estado.jugadoresInfo[pos].nrCartas === 0){//posible ganador 
                if(datos.accion === "jugar" || (datos.accion ==="mentiroso" && !mentiroso)){ //si el siguiente jugador decide no levantar o levanta y era verdad
                    estado.partidaFinalizada=true;
                    estado.ganador=estado.jugadoresInfo[pos];
                }
        }

        daoPartida.stateUpdate(datos.gameId, JSON.stringify(estado), (err)=>{
            if(err){
                response.status(500);
                console.log(err);
            }
            let infoJugadorActual=estado.jugadoresCartas;
            for(let player of infoJugadorActual){
                let id=player.idJugador;
                if(id===request.user.id){
                    estado.jugadoresCartas=player;
                }
            }
            response.status(200);
            //Añadir si decía la verdad o no
            response.json({gameInfo:estado,mentiroso:mentiroso, nrCartasJugadas: nrCartasJugadas});
        }); 
    });  
});

app.get("/logout",passport.authenticate('basic', {session: false}),(request,response)=>{
    request.logout();
    response.json({});
});

app.listen(config.port, function(err) {
    if (err) {
        console.log("No se ha podido iniciar el servidor.")
        console.log(err);
    } else {
        console.log(`Servidor escuchando en puerto ${config.port}.`);
    }
});