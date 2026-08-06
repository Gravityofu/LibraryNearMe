import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ScrapService } from './scrap.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin/scrap')
export class ScrapController {
  constructor(private scrapService: ScrapService) {}

  @Post('fetch')
  @UseGuards(AdminGuard)
  fetch(@Body() body: { source: string; url: string }) {
    return this.scrapService.fetchArticle(String(body.source || 'other'), String(body.url || ''));
  }
}