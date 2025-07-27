import { NextResponse } from 'next/server';
import { testRedisConnection } from '@/app/utils/redis';

export async function GET() {
  try {
    const isConnected = await testRedisConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Vercel Redis is working correctly!',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Vercel Redis connection failed'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 