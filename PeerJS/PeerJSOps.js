var PeerServer = ( function() {

    const myKey = 'qxh7qp1coby8ehfr';
    var peer;
    var conn;

    var myPeerId;

    function initConn(dataConn) {

        conn = dataConn;

        //console.log('got connect from: '+dataConn.peer);
        conn.on('open', function() {

            console.log('conn opened');
            conn.send('hi!');
        });

        // Receive messages
        conn.on('data', function(data) {

            console.log('Received', data);
        });
    }

    function peerOpen( callback ) {

        peer = new Peer({key: myKey});
        peer.on('open', function(id) {

            myPeerId = id;
            console.log('My peer ID is: ' + id);
            callback(id);
        });

        //Receive connection
        peer.on('connection', function(dataConn) {

            initConn(dataConn);
        });
    }

    function peerConnect( peerid ) {

        setConn( peer.connect( peerid ) );
    }

    function peerSend( data ) {

        //add some tech data if needed
        conn && conn.send( data );
    }

    return {

        //open connection to PeerJs server
        open : function( callback ) {

            peerOpen( callback );
        },

        //connect to peerid
        connect : function( peerid ) {

            peerConnect( peerid );
        },

        //send data to everyone connected
        send : function( data ) {

            peerSend( data );
        }
    }
} () );