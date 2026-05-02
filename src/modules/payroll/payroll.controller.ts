import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './payroll.dto';

@Controller('payroll')
export class PayrollController {
  constructor(private svc: PayrollService) {}

  @Post()
  create(@Body() dto: CreatePayrollDto) {
    return this.svc.create(dto);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.svc.approve(id);
  }

  @Post(':id/execute')
  execute(@Param('id') id: string) {
    return this.svc.execute(id);
  }

  @Get(':id')
  getStatus(@Param('id') id: string) {
    return this.svc.getStatus(id);
  }
}
