import { Injectable, Logger } from '@nestjs/common';
import { createCanvas } from '@napi-rs/canvas';

export interface BrandedGraphicOptions {
  businessName: string;
  offerText: string;
  niche?: string;
  vibe?: string;
  headline?: string;
  description?: string;
  ctaType?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  contactDetails?: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
}

export interface VibePalette {
  bgStart: string;
  bgEnd: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  subtextColor: string;
}

@Injectable()
export class GraphicGeneratorService {
  private readonly logger = new Logger(GraphicGeneratorService.name);

  /**
   * Returns tailored color palettes based on brand vibe.
   */
  private getPaletteForVibe(vibe?: string): VibePalette {
    const v = (vibe || '').toLowerCase();

    if (v.includes('luxurious') || v.includes('elite') || v.includes('premium')) {
      return {
        bgStart: '#2e1065',
        bgEnd: '#0f051d',
        accent: '#eab308',
        badgeBg: 'rgba(234, 179, 8, 0.2)',
        badgeText: '#fef08a',
        cardBg: 'rgba(15, 5, 29, 0.75)',
        cardBorder: 'rgba(234, 179, 8, 0.4)',
        textColor: '#ffffff',
        subtextColor: '#cbd5e1',
      };
    }

    if (v.includes('eco') || v.includes('sustainable') || v.includes('mindful')) {
      return {
        bgStart: '#064e3b',
        bgEnd: '#022c22',
        accent: '#10b981',
        badgeBg: 'rgba(16, 185, 129, 0.2)',
        badgeText: '#a7f3d0',
        cardBg: 'rgba(2, 44, 34, 0.75)',
        cardBorder: 'rgba(16, 185, 129, 0.4)',
        textColor: '#ffffff',
        subtextColor: '#cbd5e1',
      };
    }

    if (v.includes('festive') || v.includes('playful') || v.includes('joyful')) {
      return {
        bgStart: '#881337',
        bgEnd: '#4c0519',
        accent: '#f59e0b',
        badgeBg: 'rgba(245, 158, 11, 0.2)',
        badgeText: '#fde68a',
        cardBg: 'rgba(76, 5, 25, 0.75)',
        cardBorder: 'rgba(245, 158, 11, 0.4)',
        textColor: '#ffffff',
        subtextColor: '#cbd5e1',
      };
    }

    if (v.includes('bold') || v.includes('high-energy') || v.includes('casual')) {
      return {
        bgStart: '#1e1b4b',
        bgEnd: '#0f172a',
        accent: '#06b6d4',
        badgeBg: 'rgba(6, 182, 212, 0.2)',
        badgeText: '#67e8f9',
        cardBg: 'rgba(15, 23, 42, 0.75)',
        cardBorder: 'rgba(6, 182, 212, 0.4)',
        textColor: '#ffffff',
        subtextColor: '#cbd5e1',
      };
    }

    // Default: Professional Corporate Navy (#0b2240) & Cyan (#0076a3)
    return {
      bgStart: '#0b2240',
      bgEnd: '#07172c',
      accent: '#0076a3',
      badgeBg: 'rgba(0, 118, 163, 0.25)',
      badgeText: '#38bdf8',
      cardBg: 'rgba(7, 23, 44, 0.8)',
      cardBorder: 'rgba(0, 118, 163, 0.4)',
      textColor: '#ffffff',
      subtextColor: '#cbd5e1',
    };
  }

  /**
   * Generates a 1080x1080 pixel branded social graphic as a PNG Buffer.
   */
  async generateBrandedGraphicBuffer(data: BrandedGraphicOptions): Promise<Buffer> {
    const width = 1080;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const palette = this.getPaletteForVibe(data.vibe);

    // 1. Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, palette.bgStart);
    bgGradient.addColorStop(1, palette.bgEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Radial Geometric Glowing Aura (Center)
    const auraGradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      50,
      width / 2,
      height / 2,
      480,
    );
    auraGradient.addColorStop(0, palette.accent + '33'); // 20% opacity hex
    auraGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGradient;
    ctx.fillRect(0, 0, width, height);

    // 3. Outer Frame Border
    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // 4. Central Glassmorphism Card Frame
    const cardX = 80;
    const cardY = 110;
    const cardW = width - 160;
    const cardH = height - 250;

    ctx.fillStyle = palette.cardBg;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 28);
    ctx.fill();

    ctx.strokeStyle = palette.cardBorder;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 28);
    ctx.stroke();

    // 5. Category/Niche Badge Pill (Top Center of Card)
    const categoryText = (data.niche || 'EXCLUSIVE PROMOTION').toUpperCase();
    ctx.font = 'bold 24px sans-serif';
    const catWidth = ctx.measureText(categoryText).width + 48;
    const catX = width / 2 - catWidth / 2;
    const catY = cardY + 50;

    ctx.fillStyle = palette.badgeBg;
    ctx.beginPath();
    ctx.roundRect(catX, catY, catWidth, 44, 22);
    ctx.fill();

    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(catX, catY, catWidth, 44, 22);
    ctx.stroke();

    ctx.fillStyle = palette.badgeText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(categoryText, width / 2, catY + 22);

    // 6. Business Name (Centered, Large Bold)
    const busName = data.businessName || 'DIPARI AI Business';
    ctx.fillStyle = palette.textColor;
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const busNameY = catY + 70;
    this.drawWrappedText(ctx, busName, width / 2, busNameY, cardW - 80, 58);

    // 7. Offer Box Frame (Centered Container)
    const offerBoxY = busNameY + 110;
    const offerBoxH = 250;
    const offerBoxW = cardW - 80;
    const offerBoxX = width / 2 - offerBoxW / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(offerBoxX, offerBoxY, offerBoxW, offerBoxH, 20);
    ctx.fill();

    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(offerBoxX, offerBoxY, offerBoxW, offerBoxH, 20);
    ctx.stroke();

    // Offer Headline & Offer Text
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ SPECIAL PROMOTIONAL OFFER', width / 2, offerBoxY + 30);

    ctx.fillStyle = palette.textColor;
    ctx.font = 'bold 40px sans-serif';
    const mainHeadline = data.headline || data.offerText || 'GET 30% OFF YOUR FIRST ORDER!';
    this.drawWrappedText(ctx, mainHeadline, width / 2, offerBoxY + 80, offerBoxW - 40, 50);

    if (data.description) {
      ctx.fillStyle = palette.subtextColor;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`✨ ${data.description}`, width / 2, offerBoxY + offerBoxH - 35);
    }

    // 8. 3D-Styled Call-to-Action Button (Bottom of Card)
    const footerY = cardY + cardH - 75;
    const btnW = 440;
    const btnH = 54;
    const btnX = width / 2 - btnW / 2;

    // 3D Shadow Layer
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(btnX + 4, footerY + 6, btnW, btnH, 27);
    ctx.fill();

    // 3D Button Surface Gradient
    const btnGradient = ctx.createLinearGradient(btnX, footerY, btnX, footerY + btnH);
    btnGradient.addColorStop(0, palette.accent);
    btnGradient.addColorStop(1, '#0284c7');
    ctx.fillStyle = btnGradient;
    ctx.beginPath();
    ctx.roundRect(btnX, footerY, btnW, btnH, 27);
    ctx.fill();

    // 3D Button Highlight Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, footerY, btnW, btnH, 27);
    ctx.stroke();

    const rawCta = (data.ctaType || 'CLAIM_OFFER_NOW').replace(/_/g, ' ');
    const ctaText = `👉 ${rawCta.toUpperCase()}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, width / 2, footerY + 27);

    // 9. Contact Details High-Contrast Footer Section (Question #8)
    const phone = data.phone || data.contactDetails?.phone || '+1-800-555-0199';
    const website = data.website || data.contactDetails?.website || 'www.brand.com';
    const email = data.email || data.contactDetails?.email || 'contact@brand.com';
    const address = data.address || data.contactDetails?.address || 'Global Hub';

    const contactBarY = height - 95;
    ctx.fillStyle = '#0f172a'; // High contrast dark slate
    ctx.fillRect(40, contactBarY, width - 80, 55);

    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, contactBarY, width - 80, 55);

    const contactText = `📞 ${phone}  |  🌐 ${website}  |  ✉️ ${email}  |  📍 ${address}`;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(contactText, width / 2, contactBarY + 27);

    // Convert Canvas to PNG Buffer
    const buffer = canvas.toBuffer('image/png');
    this.logger.log(`[GraphicGeneratorService] Successfully rendered 1080x1080 graphic buffer (${buffer.length} bytes) for business: ${data.businessName}`);
    return buffer;
  }

  /**
   * Utility to wrap and draw multiline centered text.
   */
  private drawWrappedText(
    ctx: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }
}
