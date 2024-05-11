const mineflayer = require('mineflayer')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow, GoalBreakBlock } = require('mineflayer-pathfinder').goals
const { Vec3 } = require('vec3')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 55619,
  username: 'pathfinder',
})

bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  // We create different movement generators for different type of activity
  const defaultMove = new Movements(bot)

  bot.on('path_update', (r) => {
    const nodesPerTick = (r.visitedNodes * 50 / r.time).toFixed(2)
    console.log(`I can get there in ${r.path.length} moves. Computation took ${r.time.toFixed(2)} ms (${r.visitedNodes} nodes, ${nodesPerTick} nodes/tick)`)
  })

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
    } else if (message === 'stop') {
      bot.pathfinder.stop()
    } else if(message === '!build') {
        let block = bot.blockAt(bot.entity.position.offset(0, -1, 0))
        if(block) {
          bridgeLoop (block.position.x, block.position.y, block.position.z)
        } else {
            console.log("block does not exist at 12, -56, -1.  Time to chill out")
        }
        
      } 
  })
})

/*************************************************************
 *              bridge loop
 *************************************************************/
async function bridgeLoop (x, y, z) {
        if (z < -15) {
            return
        }
        bot.pathfinder.goto(new GoalBlock(x, y, z)).then(() => placeBridgeBlock("middle"));       
}

async function placeBridgeBlock(position) {
  console.log("block position = " + position)
  await bot.equip(bot.registry.itemsByName.cobblestone.id, 'hand')

    if(position == "middle") {
      let block = bot.blockAt(bot.entity.position.offset(0, -1, 0))
      bot.placeBlock(block, new Vec3(0, 0, -1)).then(() => placeBridgeBlock("right"));
    } else if(position == "right") {
      let block = bot.blockAt(bot.entity.position.offset(1, -1, 0))
      bot.placeBlock(block, new Vec3(0, 0, -1)).then(() => placeBridgeBlock("left"));
    } else if(position == "left") {
      let block = bot.blockAt(bot.entity.position.offset(-1, -1, 0))
      await bot.placeBlock(block, new Vec3(0, 0, -1))
      setTimeout(() => bridgeLoop(block.position.x + 1, block.position.y + 1, block.position.z - 1), 250)
    } 
   
}




