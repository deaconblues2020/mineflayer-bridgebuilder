const mineflayer = require('mineflayer')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow, GoalBreakBlock } = require('mineflayer-pathfinder').goals
const { Vec3 } = require('vec3')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 55619,
  username: 'pathfinder',
})

let startPosition = null
let steps = 0
let stepLimit = 0

bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  // We create different movement generators for different type of activity
  const defaultMove = new Movements(bot)

  /*bot.on('path_update', (r) => {
    const nodesPerTick = (r.visitedNodes * 50 / r.time).toFixed(2)
    console.log(`I can get there in ${r.path.length} moves. Computation took ${r.time.toFixed(2)} ms (${r.visitedNodes} nodes, ${nodesPerTick} nodes/tick)`)
  })*/

  bot.on('goal_reached', (goal) => {
    console.log('Here I am !')
  })

  bot.on('path_reset', (reason) => {
    console.log(`Path was reset for reason: ${reason}`)
  })

  bot.on('chat', (username, message) => {
    if (username === bot.username) return

    const target = bot.players[username] ? bot.players[username].entity : null

    if (message === 'come') {
      if (!target) {
        bot.chat('I don\'t see you !')
        return
      }
      const p = target.position

      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1))
    } else if (message.startsWith('goto')) {
      const cmd = message.split(' ')

      if (cmd.length === 4) { // goto x y z
        const x = parseInt(cmd[1], 10)
        const y = parseInt(cmd[2], 10)
        const z = parseInt(cmd[3], 10)

        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalBlock(x, y, z))
      } else if (cmd.length === 3) { // goto x z
        const x = parseInt(cmd[1], 10)
        const z = parseInt(cmd[2], 10)

        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalXZ(x, z))
      } else if (cmd.length === 2) { // goto y
        const y = parseInt(cmd[1], 10)

        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalY(y))
      }
    } else if (message === 'follow') {
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalFollow(target, 3), true)
      // follow is a dynamic goal: setGoal(goal, dynamic=true)
      // when reached, the goal will stay active and will not
      // emit an event
    } else if (message === '!rotate') {
      // Turn the bot 90 degrees
      const currentYaw = bot.entity.yaw; // Get current yaw angle in radians
      const newYaw = currentYaw + (Math.PI / 2); // Add 90 degrees (PI/2 radians) to current yaw

      bot.look(newYaw, 0); // Make the bot look in the new direction (yaw, pitch)
    }  else if (message === '!direction') {
      const direction = getFacingDirection();
      console.log('Bot is facing:', direction);
    } else if (message === 'stop') {
      bot.pathfinder.stop()
    }  else if (message === 'inventory') {
      checkCobblestoneQuantity()
    } else if(message.startsWith('!build')) {
        //
        steps = 0
        const cmd = message.split(' ')
        let block = bot.blockAt(bot.entity.position.offset(0, -1, 0))
        if(block) {
          startPosition = bot.entity.position
          //const direction = getFacingDirection();
          const direction = cmd[1]
          console.log('Bot is facing:', direction);

          stepLimit = parseInt(cmd[2], 10)
          console.log('# of steps:', steps);
          bridgeLoop (block.position.x, block.position.y, block.position.z, direction)
        } else {
            console.log("block does not exist at 12, -56, -1.  Time to chill out")
        }
        
      } 
  })
})

/*************************************************************
 *              direction
 *************************************************************/

// Function to convert radians to degrees
function radToDeg(rad) {
    return rad * (180 / Math.PI);
}

// Function to get the direction the bot is facing
function getFacingDirection() {
    const yaw = bot.entity.yaw; // Get the yaw angle in radians

    // Calculate the direction based on yaw angle
    if (yaw >= -Math.PI / 4 && yaw < Math.PI / 4) {
        return 'south'; // Facing south
    } else if (yaw >= Math.PI / 4 && yaw < 3 * Math.PI / 4) {
        return 'west'; // Facing west
    } else if (yaw >= 3 * Math.PI / 4 || yaw < -3 * Math.PI / 4) {
        return 'north'; // Facing north
    } else if (yaw >= -3 * Math.PI / 4 && yaw < -Math.PI / 4) {
        return 'east'; // Facing east
    } else {
        return 'unknown'; // Facing an indeterminate direction
    }
}




/*************************************************************
 *              bridge loop north
 *************************************************************/
async function bridgeLoop (x, y, z, direction) {
  
        if (steps > stepLimit) {
            console.log("mission accomplished ")
            // go back to origin ?
            return
        }         

        bot.pathfinder.goto(new GoalBlock(x, y, z)).then(() => placeBridgeBlock("middle", direction));       
}

async function placeBridgeBlock(position, direction) {
  bot.pathfinder.setGoal(null)
    let tempOffset = offsets[direction]
    steps++
    console.log("block position = " + position)
    console.log("direction = " + direction)
    if((checkCobblestoneQuantity()) > 1) {
      await bot.equip(bot.registry.itemsByName.cobblestone.id, 'hand')
      if(position == "middle") {
        let block = bot.blockAt(bot.entity.position.offset(tempOffset.middle.x, tempOffset.middle.y, tempOffset.middle.z))
        await bot.placeBlock(block, new Vec3(tempOffset.place.x, tempOffset.place.y, tempOffset.place.z))
        setTimeout(() => placeBridgeBlock("right", direction),300)
      } else if(position == "right") {
        let block = bot.blockAt(bot.entity.position.offset(tempOffset.right.x, tempOffset.right.y, tempOffset.right.z))
        await bot.placeBlock(block, new Vec3(tempOffset.place.x, tempOffset.place.y, tempOffset.place.z))
        setTimeout(() => placeBridgeBlock("left", direction),300)
      } else if(position == "left") {
        let block = bot.blockAt(bot.entity.position.offset(tempOffset.left.x, tempOffset.left.y, tempOffset.left.z))
        await bot.placeBlock(block, new Vec3(tempOffset.place.x, tempOffset.place.y, tempOffset.place.z))
        setTimeout(() => bridgeLoop(block.position.x + tempOffset.next.x, block.position.y + tempOffset.next.y, block.position.z + tempOffset.next.z, direction), 700)
        
      } 
    } else {
      setTimeout(() => noInventory(), 250)
      
    }

}

function checkCobblestoneQuantity() {
  const cobblestone = bot.inventory.items().find(item => item.name === 'cobblestone');
  const cobblestoneCount = cobblestone ? cobblestone.count : 0;
  console.log(`Cobblestone count: ${cobblestoneCount}`);

  return cobblestoneCount
}


function noInventory() {
  
  //bot.pathfinder.setGoal(new GoalNear(startPosition.position))
}




const offsets = {
    north: {
        middle: { x: 0, y: -1, z: 0 },
        right: { x: 1, y: -1, z: 0 },
        left: { x: -1, y: -1, z: 0 },
        place: { x: 0, y: 0, z: -1 }, 
        next: { x: 1, y: 1, z: -1 }
    },
    south: {
        middle: { x: 0, y: -1, z: 0 },
        right: { x: -1, y: -1, z: 0 },
        left: { x: 1, y: -1, z: 0 },
        place: { x: 0, y: 0, z: 1 }, 
        next: { x: -1, y: 1, z: 1 }
    },
    east: {
        middle: { x: 0, y: -1, z: 0 },
        right: { x: 0, y: -1, z: 1 },
        left: { x: 0, y: -1, z: -1 },
        place: { x: 1, y: 0, z: 0 }, 
        next: { x: 1, y: 1, z: 1 }
    },
    west: {
        middle: { x: 0, y: -1, z: 0 },
        right: { x: 0, y: -1, z: -1 },
        left: { x: 0, y: -1, z: 1 },
        place: { x: -1, y: 0, z: 0 }, 
        next: { x: -1, y: 1, z: -1 }
    },
};
