import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch stores and products for context
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, category, description, rating, address')
      .eq('is_open', true);

    const { data: products } = await supabase
      .from('products')
      .select('id, name, category, description, price, store_id');

    const systemPrompt = language === 'ru' 
      ? `Вы - полезный помощник по рынку в Узбекистане. Помогайте пользователям находить магазины и товары на основе их потребностей. Отвечайте на русском языке.

Доступные магазины: ${JSON.stringify(stores || [])}
Доступные товары: ${JSON.stringify(products || [])}

Рекомендуйте магазины и товары на основе категории, местоположения, рейтинга и запросов пользователей. Будьте дружелюбны и полезны.`
      : language === 'uz'
      ? `Siz O'zbekistondagi bozor bo'yicha yordamchi assistentsiz. Foydalanuvchilarga ularning ehtiyojlariga asoslangan do'konlar va mahsulotlarni topishda yordam bering. O'zbek tilida javob bering.

Mavjud do'konlar: ${JSON.stringify(stores || [])}
Mavjud mahsulotlar: ${JSON.stringify(products || [])}

Kategoriya, joylashuv, reyting va foydalanuvchi so'rovlariga asoslangan do'konlar va mahsulotlarni tavsiya qiling. Do'stona va foydali bo'ling.`
      : `You are a helpful marketplace assistant in Uzbekistan. Help users find stores and products based on their needs. Respond in English.

Available stores: ${JSON.stringify(stores || [])}
Available products: ${JSON.stringify(products || [])}

Recommend stores and products based on category, location, rating, and user queries. Be friendly and helpful.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI request failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});