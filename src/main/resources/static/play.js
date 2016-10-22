function SphereCap(pos, rad){

    this.radius = rad;
    this.circle = new Path.Circle({
                     center: pos,
                     radius: rad,
                     fillColor: 'red'
                 });

    this.vector = new Point(0,0);

    this.keep = true;

    //add a "contained atoms" construct
    //   and a "critical number" construct
    //   so that if the contained atoms is less than then the critical number
    //   the individual atoms can desorb and leave the cluster.

    //add a "time to live" perhaps randomly varied between some values

    //set up a deposit rate and add a new number of them within that rate.  randomize it somehow

    // all of those parameters should be variable by T

    //set up a % covered limit to end the simulation

    //draw the grid.
    //draw dashboard to show time elapsed and % covered in the simulation
    //create input parameters and a go/reset button

}

SphereCap.prototype = {

    move: function(){
        //this.circle.position = this.circle.position + [1,0];
        var x = 1 - Math.random() * 2;
        var y = 1 - Math.random() * 2;
        var newx = this.circle.position.x + x;
        var newy = this.circle.position.y + y;
        var newPt = new Point(newx, newy);

        this.circle.position = newPt;
    },

    collision: function(sc){
    	var dist = this.circle.position.getDistance(sc.circle.position);
    	var myrad = this.radius;
    	var scrad = sc.radius;
    	if ( (dist < (myrad + scrad)) && (dist != 0)) {
    	    return true;
    	}
        return false;
    },

    combine: function(sc){
        var position = this.circle.position.add(sc.circle.position);
        position = position.divide(2);
        var rad = this.radius + sc.radius; //this is wrong.  do the calc
        return new SphereCap(position, rad);
    },

    remove: function(){
        this.circle.remove();
    }

}

var caps = [];

for(i = 0; i < 500; i++){
    caps.push(new SphereCap(new Point(Math.random()*750, Math.random()*750), 2));
}

var timeStepSize = .25;
var lastTime = 0;
function onFrame(event){
     lastTime = lastTime + event.delta;
     if(lastTime >=timeStepSize){
        process();
        lastTime = 0;
     }
}

function process(){
    var newCaps = [];
   	for (var i = 0; i < caps.length; i++) {
        caps[i].move();
    }

   	for (var i = 0; i < caps.length; i++) {
       	for (var j = 0; j < caps.length; j++) {
       	    if((i!=j) && (caps[j].keep)){
                if(caps[i].collision(caps[j])){
                    caps[i].keep = false;
                    caps[j].keep = false;
                    newCaps.push(caps[i].combine(caps[j]));
                }
       	    }
        }
    }
    for (var i = 0; i < caps.length; i++) {
        if(caps[i].keep){
            newCaps.push(caps[i]);
        }
        else{
            caps[i].remove();
        }
    }
    caps = newCaps;

}

function onKeyDown(event) {
	// When a key is pressed, set the content of the text item:
	//text.content = 'The ' + event.key + ' key was pressed!';
}

