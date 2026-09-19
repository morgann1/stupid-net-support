-- Network definitions
opt server_output = "network/server.luau"
opt write_checks = true

--[[ Shared payloads
type Hidden = u8
]]
namespace Shared = {
  type Position = vector(f32, f32, f32)
  type Player = struct {
    id: u32,
    name: string.utf8(1..32),
    position: Position,
    health: f32(-10.5..100),
    "display-name": string.binary?,
    inventory: map { [string.utf8]: u16 },
    flags: set { u8 },
    part: Instance.Part,
    parent: Instance(Model)?,
    transform: AlignedCFrame,
    direction: Vector3,
    value: (Color3 | buffer | unknown)
  }
  type State = enum "kind" {
    Idle {},
    Moving { target: Position }
  }
}

event Update = {
  from: Server,
  type: OrderedUnreliable,
  call: ManyAsync,
  data: (players: Shared.Player[1..64], state: Shared.State)
}

funct GetPlayer = {
  call: Async,
  args: (id: u32),
  rets: Shared.Player?
}
