var mysql = require("mysql");


/**
 * Función para crear un objeto Connection a la BD indicada.
 */
function createConnection() {
    return mysql.createConnection({
        host: "localhost",
        database: "examen_septiembre",
        user: "root",
        password: "PEPE"
    });
}

/**
 * Devuelve todas las entradas de la lista de reproducción.
 */
function getPlaylist(callback) {
    var connection = createConnection();

    //
    // Completa aquí el apartado 1.a
    let sql = "select * from playlist";
    connection.query(sql,
        (err,rows)=>{
            if(err){
                console.log(err);
                callback(err);
            }
            else{
                callback(null,rows);
            }
        }
    );
}

/**
 * Inserta un elemento nuevo en la lista de reproducción.
 */
function insertInPlaylist(title, author, album, year, callback) {
    var connection = createConnection();
    let sql = "insert into playlist (title,author,album,year) values (?,?,?,?)"
    // Completa aquí el apartado 1.b
    connection.query(sql,
        [title,author,album,year],
        (err,rows)=>{
            if(err){
                console.log(err);
                callback(err);
            }
            else{
                callback(null,true);
            }
        }
    );
}

module.exports = {
    getPlaylist: getPlaylist,
    insertInPlaylist: insertInPlaylist
};