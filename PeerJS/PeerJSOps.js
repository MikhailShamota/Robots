var PeerServer = ( function() {

    const myKey = 'qxh7qp1coby8ehfr';
    var peer;
    var conn;

    var myPeerId;

    var callbackOpen;
    var callbackReceive;
    var callbackConnect;

    function initConn( dataConn ) {

        conn = dataConn;

        //console.log('got connect from: '+dataConn.peer);
        conn.on('open', function() {

            console.log('conn opened');
            conn.send('hi!');
            callbackConnect && callbackConnect();
        });

        // Receive messages
        conn.on('data', function(data) {

            callbackReceive && callbackReceive( conn.peer, data );
            !callbackReceive && console.log('Received from ' + conn.peer, data);
        });
    }

    function peerOpen() {

        peer = new Peer({key: myKey});
        peer.on('open', function(id) {

            myPeerId = id;
            console.log('My peer ID is: ' + id);
            callbackOpen && callbackOpen(id);
        });

        //Receive connection
        peer.on('connection', function(dataConn) {

            initConn(dataConn);
        });
    }

    function peerConnect( peerid ) {

        initConn( peer.connect( peerid ) );
    }

    function peerSend( data ) {

        //add some tech data if needed
        conn && conn.send( data );
    }

    return {

        //open connection to PeerJs server
        open : function() {

            peerOpen();
        },

        //connect to peerid
        connect : function( peerid ) {

            peerConnect( peerid );
        },

        //send data to everyone connected
        send : function( data ) {

            peerSend( data );
        },

        //getPeerId
        getMyPeerId : function() {

            return myPeerId;
        },

        setCallbackOpen( func ) {

            callbackOpen = func;
        },

        setCallbackConnect( func ) {

            callbackConnect = func;
        },

        setCallbackReceive( func ) {

            callbackReceive = func;
        }
    }
} () );