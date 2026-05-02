import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { CreateEscrowDto } from './escrow.dto';

@Controller('escrow')
export class EscrowController {
  constructor(private svc: EscrowService) {}

  @Post()
  create(@Body() dto: CreateEscrowDto) {
    return this.svc.create(dto);
  }

  @Post(':id/release')
  release(@Param('id') id: string, @Query('depositor') depositor: string) {
    return this.svc.release(id, depositor);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string, @Query('depositor') depositor: string) {
    return this.svc.refund(id, depositor);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }
}
