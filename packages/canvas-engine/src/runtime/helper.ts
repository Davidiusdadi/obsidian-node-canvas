// helper to force in  a type hint into zod
import {z} from "zod"

export const zz = <T extends object>() => z.any({})
    .transform(v => v as any as T)
