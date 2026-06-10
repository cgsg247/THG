# Screen Space Effects

**SSR** - screen space reflection

- это метод отражений в экранном пространстве, который позволяет генерировать отражения в реальном времени, основываясь на информации, доступной в буфере изображения

**реализация в проекте:**
- ttv_sseffects.c
- ttv_sseffects.h

Чтобы реализовать SSR нужен G-Buffer кадра, который включает в себя 3 текстуры:
- Color map (цвет пикселя)
- Normal map (нормаль пикселя)
- Depth map (глубина пикселя)

(получаем эти текстуры на высоком уровне от рустама) **дальше создаем SSR шейдер** и скидываем туда эти текстуры

**Матрица проекции:**

![perspective projection](https://habrastorage.org/r/w1560/getpro/habr/post_images/9fb/4e3/603/9fb4e3603836f19a3c05f230b03c2ef7.jpg)

>Зная матрицу проекции и экранные координаты (а так же глубину) для каждого пикселя мы вычисляем его позицию следующим образом:

*(пример с хабра)*
```glsl
vec3 GetPosition( vec2 UV, float depth ) 
{
	vec4 position = 1.0f; 
 
	position.x = UV.x * 2.0f - 1.0f; 
	position.y = -(UV.y * 2.0f - 1.0f); 

	position.z = depth; 
 
	position = mul(position, InverseViewProjection); 
 
	position /= position.w;

	return position.xyz;
}
```

После нам нужно найти направяющий вектор (dir) на этот пиксель:
```glsl
vec3 viewDir = normalize(texelPosition - CameraPosition); // CameraPosition - позиция камеры
```
И найти отражение этого вектра от нормали в текущем пикселе:
```glsl
vec3 reflectDir = normalize(reflect(viewDir, texelNormal));
```

Далее задача сводится к трассировке карты глубины. Т.е. нам нужно найти пересечение отраженного вектора с какой-либо геометрией. В этом варианте мы берем некоторое начальное приближение L и динамически меняем его исходя из расстояния между нашим текселем и позицией, которую мы “восстановили”:
```glsl
...
vec3 currentRay = vec3(0);

vec3 nuv = (0);
float L = LFactor;

for (int i = 0; i < 10; i++)
{
    currentRay = texelPosition + reflectDir * L;

    nuv = GetUV(currentRay); // проецирование позиции на экран
    float n = GetDepth(nuv.xy); // чтение глубины из DepthMap по UV

    float3 newPosition = GetPosition(nuv.xy, n);
    L = length(texelPosition - newPosition);
}
...

// функция получения экранных координат (и глубину), зная позицию в мировой системе координат
	vec3 GetUV( vec3 position )
	{
		vec4 pVP = mul(float4(position, 1.0f), ViewProjection);
		pVP.xy = vec2(0.5f, 0.5f) + vec2(0.5f, -0.5f) * pVP.xy / pVP.w;
		return vec3(pVP.xy, pVP.z / pVP.w);
	}
```

- После завершения итераций мы получаем позицию “пересечения с отраженной геометрией”. А наше значение nuv будет проекцией этого пересечения на экран, т.е. nuv.xy – это экранные координаты, а nuv.z это восстановленная глубина.

В конце итераций L будет показывать расстояние отраженного пикселя. **Последний этап** — добавление отражения к Color Map:
```glsl
...
vec3 Color_nuv = GetColor(nuv.xy).rgb; // равносильно tex2D(GBufferColorMap, UV).rgb
return vec4(cnuv, 1);
```

**Функции, которые необходимо создать (предположительно)**
| Название функциии         | Описание функции  | 
|---------------------------|-------------------|
| VOID TTV_SSRInit( VOID ); | инициализация SSR |
| TTV_SSRDraw               | отрисовка зеркальных объектов после прохода на шейдерах |
| VOID TTV_SSRClose( VOID );| деинициализация SSR |

??? возможно надо изменить материалы, добавив параметр - коэффициент зеркальности (0 - полностью матовый объект, 1 - полностью зеркальный объект, если > 0 и < 1, то домножать на этот коээфициент в frag.glsl)

также идея ввести виды отражения (материалы отражающих поверхностей (roughness, metal, ...))
```glsl
...
    position += direction;

        projectedCoords = gProjectionMatrix * vec4(position, 1.0f);
        projectedCoords.xy /= projectedCoords.w;
        projectedCoords.xy = projectedCoords.xy * 0.5f + 0.5f;

        depth = texture(gPositionMap, projectedCoords.xy).z;

        delta = position.z - depth;

        // if (depth - (position.z - direction.z) < 1.2f)
        // Is the difference between the starting and sampled depths smaller than the width of the unit cube?
        // We don't want to sample too far from the starting position.
        if (direction.z - delta < 1.2f)
        {
            // We're at least past the point where the ray intersects a surface.
            // Now, determine the values at the precise location of intersection.
            if (delta < 0.0f)
            {
                return vec4(binarySearch(position, direction, delta), 1.0f);
            }
        }
```

```glsl
vec3 binarySearch(inout vec3 position, inout vec3 direction, inout float delta)
{
    vec4 projectedCoords;
    float depth;

    for (int i = 0; i < NUM_ITERATIONS; ++i)
    {
        direction *= BINARY_SEARCH_STEP;

        projectedCoords = gProjectionMatrix * vec4(position, 1.0f);
        projectedCoords.xy /= projectedCoords.w;
        projectedCoords.xy = projectedCoords.xy * 0.5f + 0.5f;

        depth = texture(gPositionMap, projectedCoords.xy).z;

        delta = position.z - depth;

        if (delta > 0.0f)
        {
            position += direction;
        }
        else
        {
            position -= direction;
        }
    }
    projectedCoords = gProjectionMatrix * vec4(position, 1.0f);
    projectedCoords.xy /= projectedCoords.w;
    projectedCoords.xy = projectedCoords.xy * 0.5f + 0.5f;
    return vec3(projectedCoords.xy, depth);
}
```

```glsl
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 15.05.2026.
 * NOTE        : None.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

//in vec4 v_Pos;
in mat4 v_MatrWInv;
in vec3 v_Normal;

#define NUM_STEPS 100
#define NUM_ITERATIONS 100
#define BINARY_SEARCH_STEP 0.1

#define searchDist 5
#define searchDistInv 0.2
#define maxDDepth 1.0
#define maxDDepthInv 1.0
#define minRayStep 0.1
#define reflectionSpecularFalloffExponent 3.0

/* Get world position from UV coordinates fucntion.
 * ARGUMENTS:
 *   - screen coordinates:
 *       vec2 UV;
 * RETURNS: (vec3) world position.
 */
vec3 GetPosition( vec2 UV ) 
{
  float z = texture(DepthTex, UV).r;
  vec4 clip = vec4(UV * 2.0 - 1.0, z * 2.0 - 1.0);
  vec4 view = inverse(MatrP) * clip;
  
  return view.xyz / view.z;
} /* End of 'GetPosition' function */

/* Get UV from world position fucntion.
 * ARGUMENTS:
 *   - world position:
 *       vec3 Pos;
 * RETURNS: (vec2) UV.
 */
vec2 GetUV( vec3 Pos )
{
  vec4 clip = vec4(Pos, 1.0) * MatrP;
  vec3 ndc = clip.xyz / clip.w;
  
  return ndc.xy * 0.5 + 0.5;
} /* End of 'GetUV' function */

vec3 BinarySearch( vec3 Dir, vec3 hitCoord, float dDepth )
{
 
}

/* Ray marching fucntion.
 * ARGUMENTS:
 *   - world position:
 *       vec3 Pos;
 *   - directional vector:
 *       vec3 Dir;
 * RETURNS: (vec4) vertex after ray marching.
 */
vec4 RayMarch( vec3 Pos, vec3 Dir )
{
  vec4 projectedCoords;
  float depth, delta;

  Dir *= NUM_STEPS;

  for (int i = 0; i < NUM_STEPS; i++)
  {
    projectedCoords = vec4(GetUV(Pos), 0);
    depth = texture(DepthTex, projectedCoords.xy).z;

    delta = Pos.z - depth;

    if (Dir.z - delta < 1.2)
      if (delta < 0.0)
        return vec4(binarySearch(Pos, Dir, delta), 1.0);
  }
  return vec4(projectedCoords.xy, depth, 0);
} /* End of 'RayMarch' function */

/* The main shader function */
void main( void )
{
  /*
  vec3 viewDir = normalize(v_Pos.xyz - CamLoc.xyz);
  vec3 reflectDir = normalize(reflect(viewDir, v_Normal));

  OutColor = texture(ColorTex, RayMarch(v_Pos.xyz, viewDir).xy);
  */
  vec2 gTexCoord = gl_FragCoord.xy;
  // Samples
  float specular = texture(ColorTex, gTexCoord).a;


  if (specular == 0)
  {
    OutColor = vec4(0);
    return;
  }

  vec3 viewNormal = texture(NormalTex, gTexCoord).xyz;
  vec3 viewPos = texture(DepthTex, gTexCoord).xyz;

  // Reflection vector
  vec3 reflected = normalize(reflect(normalize(viewPos), normalize(viewNormal)));

  // Ray cast
  vec3 hitPos = viewPos;
  vec4 coords = RayMarch(hitPos, reflected * max(minRayStep, -viewPos.z));
  vec2 dCoords = abs(vec2(0.5, 0.5) - coords.xy);
  float screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);

  // Get color
  OutColor = vec4(texture(ColorTex, coords.xy).rgb,
                  pow(specular, reflectionSpecularFalloffExponent) *
                  screenEdgefactor * clamp(-reflected.z, 0.0, 1.0) *
                  clamp((searchDist - length(viewPos - hitPos)) * searchDistInv, 0.0, 1.0) * coords.w);
} /* End of 'main' function */

/* END OF 'frag.glsl' FILE */
```

```glsl
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 20.05.2026.
 * NOTE        : None.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

/* 1 ray step size */
float RayStep = 0.25;

/* Min first ray step size */
float MinRayStep = 0.01;

/* Max step count */
int MaxSteps = 50;

/* Binary search iterations steps count */
int BinarySteps = 50;

float searchDist = 50;
float searchDistInv = 0.01;
float reflectionSpecularFalloffExponent = 3.0;

/* Get world position from UV coordinates fucntion.
 * ARGUMENTS:
 *   - screen coordinates:
 *       vec2 UV;
 * RETURNS: (vec3) world position.
 */
vec3 GetPosFromUV( vec2 UV ) 
{
  float z = texture(DepthTex, UV).r;
  vec4 clip = vec4(UV * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  vec4 view = inverse(MatrP) * clip;
  
  return view.xyz / view.z;
} /* End of 'GetPositionfromUV' function */

/* Get UV from world position fucntion.
 * ARGUMENTS:
 *   - world position:
 *       vec3 Pos;
 * RETURNS: (vec2) UV.
 */
vec2 GetUV( vec3 Pos )
{
  vec4 clip = vec4(Pos, 1.0) * MatrVP;
  vec3 ndc = clip.xyz / clip.w;
  
  return ndc.xy * 0.5 + 0.5;
} /* End of 'GetUV' function */

/*
vec2 GetUV( vec3 Pos )
{
  vec4 pVP = vec4(Pos, 1.0) * MatrV;
  pVP.xy = 0.5 + vec2(0.5, 0.5) * pVP.xy / pVP.w;
  return pVP.xy;//, pVP.z / pVP.w);
}
*/

vec3 BinarySearch( vec3 Dir, vec3 hitCoord, float dDepth )
{
  float depth;
  vec2 uv;

  for (int i = 0; i < BinarySteps; i++)
  {
    uv = GetUV(hitCoord);
    depth = GetPosFromUV(uv).z;
    dDepth = hitCoord.z - depth;
    
    if (dDepth > 0)
      hitCoord += Dir;
    Dir *= 0.5;
    hitCoord -= Dir;
  }
  uv = GetUV(hitCoord);
  return vec3(uv, GetPosFromUV(uv).z);
} /* End of 'BinarySearch' funciton */

/* Ray marching fucntion.
 * ARGUMENTS:
 *   - directional vector:
 *       vec3 Dir;
 *   - current point coord:
 *       vec3 hitCoord;
 *   - depth difference:
 *       float dDepth;
 * RETURNS: (vec4) vertex after ray marching.
 */
vec4 RayMarch( vec3 Dir, vec3 hitCoord )
{
  vec4 projectedCoords;
  float depth, delta;

  Dir *= RayStep;

  projectedCoords.xy = GetUV(hitCoord);

  depth = texture(DepthTex, projectedCoords.xy).z;

  delta = hitCoord.z - depth;

  if (projectedCoords.x < 0 || projectedCoords.x > 1 || projectedCoords.y < 0 || projectedCoords.y > 1)
    return vec4(0, 1, 0, 1);
  if (Dir.z - delta < 1.2)
    if (delta < 0.0)
      return vec4(BinarySearch(Dir, hitCoord, delta), 1.0);

  return vec4(projectedCoords.xy, depth, 0);
} /* End of 'RayMarch' fucntion */

/* The main shader function */
void main( void )
{
  /*
  vec2 v_uv1 = gl_FragCoord.xy;
  vec3 Ks = texture(KsTex, v_uv1).rgb;
  float specular = dot(Ks, vec3(1));

  if (specular <= 0)
    return;
  
  vec3 Pos = GetPosFromUV(v_uv1);
  vec3 Normal = normalize(texture(NormalTex, v_uv1).xyz * 2.0 - 1.0);
  vec3 reflected = normalize(reflect(normalize(Pos), Normal));
  */
  vec2 gTexCoord = gl_FragCoord.xy;
  vec3 Ks = texture(KsTex, gTexCoord).rgb;
  float specular = dot(Ks, vec3(1));

  /*
  if (specular == 0)
  {
    //OutColor = vec4(1);
    return;
  }
  */
  vec3 viewNormal = normalize(texture(NormalTex, gTexCoord).xyz * 2.0 - 1.0);
  vec3 viewPos = GetPosFromUV(gTexCoord);

  // Reflection vector
  vec3 reflected = normalize(reflect(normalize(viewPos), viewNormal));

  vec3 hitPos = viewPos;
  vec4 coords = RayMarch(reflected * max(MinRayStep, -viewPos.z), hitPos);
   
  if (coords.z < 0)
  {
    OutColor = vec4(1, 0, 0, 1);
    return;
  }
  
  vec3 reflectedColor = texture(ColorTex, coords.xy).rgb;
  reflectedColor *= specular;
  OutColor = vec4(reflectedColor, 1);
  //OutColor = vec4(1, 0, 0, 1);
  /*
  vec3 hitPos = viewPos;
  vec4 coords = RayMarch(reflected * max(MinRayStep, -viewPos.z), hitPos);
  vec2 dCoords = abs(vec2(0.5, 0.5) - coords.xy);
  float screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);

  // Get color
  OutColor = vec4(texture(ColorTex, coords.xy).rgb,
                  pow(specular, reflectionSpecularFalloffExponent) *
                  screenEdgefactor * clamp(-reflected.z, 0.0, 1.0) *
                  clamp((searchDist - length(viewPos - hitPos)) * searchDistInv, 0.0, 1.0) * coords.w);
  */
  /*
  vec2 gTexCoord = gl_FragCoord.xy;
  float specular = texture(ColorTex, gTexCoord).a;

  if (specular == 0)
  {
    OutColor = vec4(0);
    return;
  }

  vec3 viewNormal = texture(NormalTex, gTexCoord).xyz;
  vec3 viewPos = texture(DepthTex, gTexCoord).xyz;

  // Reflection vector
  vec3 reflected = normalize(reflect(normalize(viewPos), normalize(viewNormal)));

  // Ray cast
  vec3 hitPos = viewPos;
  vec4 coords = RayMarch(reflected * max(MinRayStep, -viewPos.z), hitPos);
  vec2 dCoords = abs(vec2(0.5, 0.5) - coords.xy);
  float screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);

  // Get color
  OutColor = vec4(texture(ColorTex, coords.xy).rgb,
                  pow(specular, reflectionSpecularFalloffExponent) *
                  screenEdgefactor * clamp(-reflected.z, 0.0, 1.0) *
                  clamp((searchDist - length(viewPos - hitPos)) * searchDistInv, 0.0, 1.0) * coords.w);
  */
  //OutColor = vec4(1, 0, 0, 0);
} /* End of 'main' function */

/* END OF 'frag.glsl' FILE */
```
```glsl
vec2 gTexCoord = gl_FragCoord.xy;
  vec3 viewPos = GetPosition(gTexCoord, GetDepth(gTexCoord));

  /*
  if (abs(viewPos.z) < 0.001)
  {
    OutColor = vec4(0);
    return;
  }
  */
  
  float specular = texture(KsTex, gTexCoord).a;
 /*  
if (specular == 0)
  {
    OutColor = vec4(0);
    return;
  }
 */
  
  vec3 viewNormal = normalize(texture(NormalTex, gTexCoord).xyz * 2.0 - 1.0);

  // Reflection vector
  vec3 reflected = normalize(reflect(normalize(-viewPos), viewNormal));

  vec3 hitPos = viewPos + reflected * RayStep;
  float dDepth;
  vec4 coords = RayMarch(reflected, viewPos, dDepth);
  
  /* 
  if (coords < 0.5)
  {
    OutColor = vec4(0, 1, 0, 1);
    return;
  }
  */
  
  vec3 reflectedColor = texture(ColorTex, coords.xy).rgb;
  reflectedColor *= specular;

  OutColor = vec4(reflectedColor, 1);
```

```glsl
/* 22.05.2026 18:54 */
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 20.05.2026.
 * NOTE        : None.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

/* 1 ray step size */
float RayStep = 0.05;

/* Min first ray step size */
float MinRayStep = 0.01;

/* Max step count */
int MaxSteps = 40;

/* Binary search iterations steps count */
int BinarySteps = 8;

float searchDist = 50;
float searchDistInv = 0.01;
float reflectionSpecularFalloffExponent = 3.0;

/* Get depth from UV coordinates fucntion.
 * ARGUMENTS:
 *   - screen coordinates:
 *       vec2 UV;
 * RETURNS: (float) world position.
 */
float GetDepth( vec2 UV ) 
{ 
  return texture(DepthTex, UV).r;
} /* End of 'GetPositionfromUV' function */

/* Get UV from world position fucntion.
 * ARGUMENTS:
 *   - world position:
 *       vec3 Pos;
 * RETURNS: (vec2) UV.
 */
vec2 GetUV( vec3 Pos )
{
  vec4 clip = vec4(Pos, 1.0) * MatrP;
  vec3 ndc = clip.xyz / clip.w;
  
  return ndc.xy * 0.5 + 0.5;
} /* End of 'GetUV' function */

/* Get world position from UV coordinates and depth fucntion.
 * ARGUMENTS:
 *   - screen coordinates:
 *       vec2 UV;
 *   - depth:
 *       float depth;
 * RETURNS: (vec3) world position.
 */
vec3 GetPosition( vec2 UV, float depth )
{
  vec4 position = vec4(1);
  position.x = UV.x * 2.0 - 1.0;
  position.y = -(UV.y * 2.0 - 1.0);
  position.z = depth;

  position = position * inverse(MatrVP);
  position /= position.w;
  return position.xyz;
} /* End of 'GetPosition' fucntion */

/*
vec3 BinarySearch( vec3 Dir, vec3 hitCoord, float dDepth )
{
  float depth;
  vec2 uv;

  for (int i = 0; i < BinarySteps; i++)
  {
    uv = GetUV(hitCoord);
    depth = GetPosFromUV(uv).z;
    dDepth = hitCoord.z - depth;
    
    if (dDepth > 0)
      hitCoord += Dir;
    Dir *= 0.5;
    hitCoord -= Dir;
  }
  uv = GetUV(hitCoord);
  return vec3(uv, GetPosFromUV(uv).z);
} *//* End of 'BinarySearch' funciton */

vec3 BinarySearch( vec3 start, vec3 end, out float OutDepth )
{
  vec2 uv;
  float depth;

  for (int i = 0; i < BinarySteps; i++)
  {
    vec3 mid = (start + end) * 0.5;
    uv = GetUV(mid);
   
    depth = GetDepth(uv + 0.5 * vec2(1 / FrameW, 1 / FrameH));
    OutDepth = mid.z - depth;
    
    if (abs(OutDepth) < RayStep)
      return vec3(uv, depth);
    if (OutDepth > 0)
      start = mid;
    else
      end = mid;
  }
  uv = GetUV((start + end) * 0.5);
  depth = GetDepth(uv + 0.5 * vec2(1 / FrameW, 1 / FrameH));
  return vec3(uv, depth);
} /* End of 'BinarySearch' funciton */

/* Ray marching fucntion.
 * ARGUMENTS:
 *   - directional vector:
 *       vec3 Dir;
 *   - current point coord:
 *       vec3 hitCoord;
 *   - depth difference:
 *       float OutDepth;
 * RETURNS: (vec4) vertex after ray marching.
 */
vec4 RayMarch( vec3 Dir, vec3 Pos, out float OutDepth )
{
  /*
  vec4 projectedCoords;
  float depth, delta;

  projectedCoords.xy = GetUV(hitCoord);

  depth = texture(DepthTex, projectedCoords.xy).z;

  delta = hitCoord.z - depth;
  
  if (Dir.z - delta < 1.2)
    if (delta < 0.0)
      return vec4(BinarySearch(Dir, hitCoord, delta), 1.0);

  return vec4(projectedCoords.xy, depth, 0);
  */
  vec3 prevHit = Pos;
  float prevDDist = 0;

  for (int i = 0; i < MaxSteps; i++)
  {
    vec3 hitPos = Pos + Dir * RayStep * i;
    
    vec2 projCoord = GetUV(hitPos);
    
    if (projCoord.x < 0 || projCoord.x > 1 || projCoord.y < 0 || projCoord.y > 1)
      return vec4(0);
    
    float sceneDepth = GetDepth(projCoord.xy + 0.5 * vec2(1 / FrameW, 1 / FrameH));
    if (abs(sceneDepth) < 0.001)
      continue;
    float dDepth = hitPos.z - sceneDepth;
    if (prevDDist > 0 && dDepth <= 0)
      return vec4(BinarySearch(prevHit, hitPos, OutDepth), 1.0);
   prevDDist = dDepth;
   prevHit = hitPos;
  }
} /* End of 'RayMarch' fucntion */

/* The main shader function */
void main( void )
{
  vec2 gTexCoord = gl_FragCoord.xy;
  vec3 Ks = texture(KsTex, gTexCoord).rgb;
  float specular = dot(Ks, vec3(1));

  if (specular == 0)
  {
    OutColor = vec4(0);
    return;
  }
  
  vec3 viewNormal = normalize(texture(NormalTex, gTexCoord).xyz * 2.0 - 1.0);
  vec3 viewPos = GetPosition(gTexCoord, GetDepth(gTexCoord));

  // Reflection vector
  vec3 reflected = normalize(reflect(normalize(-viewPos), viewNormal));

  vec3 hitPos = viewPos;
  float dDepth;
  vec4 coords = RayMarch(reflected, viewPos, dDepth);
   
  if (coords.w < 0.5)
  {
    OutColor = vec4(0, 1, 0, 1);
    return;
  }
  
  vec3 reflectedColor = texture(ColorTex, coords.xy).rgb;
  reflectedColor *= specular;

  OutColor = vec4(reflectedColor, 1);
}       
/* End of 'main' function */

/* END OF 'frag.glsl' FILE */
```

```glsl
29.05.2026 -- 15:04
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 20.05.2026.
 * NOTE        : None.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

/* 1 ray step size */
float RayStep = 0.05;

/* Min first ray step size */
float MinRayStep = 0.01;

/* Max step count */
int MaxSteps = 50;

/* Binary search iterations steps count */
int BinarySteps = 50;

float searchDist = 50;
float searchDistInv = 0.01;
float reflectionSpecularFalloffExponent = 3.0;

/* Get world position from UV coordinates fucntion.
 * ARGUMENTS:
 *   - screen coordinates:
 *       vec2 UV;
 * RETURNS: (vec3) world position.
 */
/*
vec3 GetPosFromUV( vec2 UV ) 
{
  float z = texture(DepthTex, UV).r;
  vec4 clip = vec4(UV * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  vec4 view = inverse(MatrVP) * clip;
  
  return view.xyz / view.z;
} *//* End of 'GetPositionfromUV' function */

/* Get UV from world position fucntion.
 * ARGUMENTS:
 *   - world position:
 *       vec3 Pos;
 * RETURNS: (vec2) UV.
 */
vec2 GetUV( vec3 Pos )
{
  vec4 clip = vec4(Pos, 1.0) * MatrP;
  vec3 ndc = clip.xyz / clip.w;
  
  return ndc.xy * 0.5 + 0.5;
} /* End of 'GetUV' function */

vec3 BinarySearch( vec3 Dir, vec3 hitCoord, float dDepth )
{
  float depth;
  vec2 uv;

  for (int i = 0; i < BinarySteps; i++)
  {
    uv = GetUV(hitCoord);
    depth = GetPosFromUV(uv).z;
    dDepth = hitCoord.z - depth;
    
    if (dDepth > 0)
      hitCoord += Dir;
    Dir *= 0.5;
    hitCoord -= Dir;
  }
  uv = GetUV(hitCoord);
  return vec3(uv, GetPosFromUV(uv).z);
} /* End of 'BinarySearch' funciton */

/* Ray marching fucntion.
 * ARGUMENTS:
 *   - directional vector:
 *       vec3 Dir;
 *   - current point coord:
 *       vec3 hitCoord;
 *   - depth difference:
 *       float dDepth;
 * RETURNS: (vec4) vertex after ray marching.
 */
vec4 RayMarch( vec3 Dir, vec3 hitCoord )
{
  vec4 projectedCoords;
  float depth, delta;

  Dir *= RayStep;

  projectedCoords.xy = GetUV(hitCoord);

  depth = texture(DepthTex, projectedCoords.xy).z;

  delta = hitCoord.z - depth;

  if (projectedCoords.x < 0 || projectedCoords.x > 1 || projectedCoords.y < 0 || projectedCoords.y > 1)
    return vec4(0, 1, 0, 1);
  if (Dir.z - delta < 1.2)
    if (delta < 0.0)
      return vec4(BinarySearch(Dir, hitCoord, delta), 1.0);

  return vec4(projectedCoords.xy, depth, 0);
} /* End of 'RayMarch' fucntion */

/* The main shader function */
void main( void )
{
  vec2 gTexCoord = gl_FragCoord.xy;
  vec3 Ks = texture(KsTex, gTexCoord).rgb;
  float specular = dot(Ks, vec3(1));

  if (specular == 0)
  {
    //OutColor = vec4(1);
    return;
  }

  vec3 viewNormal = normalize(texture(NormalTex, gTexCoord).xyz * 2.0 - 1.0);
  vec3 viewPos = GetPosFromUV(gTexCoord);

  // Reflection vector
  vec3 reflected = normalize(reflect(normalize(-viewPos), viewNormal));

  vec3 hitPos = viewPos;
  vec4 coords = RayMarch(reflected * max(MinRayStep, -viewPos.z), hitPos);
   
  if (coords.z < 0)
  {
    OutColor = vec4(1, 0, 0, 1);
    return;
  }
  
  vec3 reflectedColor = texture(ColorTex, coords.xy).rgb;
  reflectedColor *= specular;
  OutColor = vec4(reflectedColor, 1);
} /* End of 'main' function */

/* END OF 'frag.glsl' FILE */
```

```glsl
29.05.2026 -- 19:41
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 29.05.2026.
 * NOTE        : None.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

/* 1 ray step size */
float RayStep = 0.02;

/* Min first ray step size */
float MinRayStep = 0.03;

/* Max step count */
int MaxSteps = 50;

/* Binary search iterations steps count */
int BinarySteps = 50;

float SearchDist = 50;

/* Get normal from normal texture fucntion.
 * ARGUMENTS:
 *   - uv:
 *     vec2 UV;
 * RETURNS: (vec3) normal.
 */
vec4 GetNormal( vec2 UV )
{
  return normalize(texture(NormalTex, UV));
} /* End of 'GetNormal' function */

/* Get depth from depth texture fucntion.
 * ARGUMENTS:
 *   - uv:
 *     vec2 UV;
 * RETURNS: (float) depth.
 */
float GetDepth( vec2 UV )
{
  return texture(DepthTex, UV).r;
} /* End of 'GetDepth' function */

/* Get color from color texture fucntion.
 * ARGUMENTS:
 *   - uv:
 *     vec2 UV;
 * RETURNS: (vec3) color.
 */
vec3 GetColor( vec2 UV )
{
  return texture(ColorTex, UV).rgb;
} /* End of 'GetColor' function */

/* Get UV from world position fucntion.
 * ARGUMENTS:
 *   - world position:
 *       vec3 Pos;
 * RETURNS: (vec2) UV.
 */
vec2 GetUV( vec3 Pos )
{
  vec4 clip = vec4(Pos, 1.0) * MatrP;
  vec3 ndc = clip.xyz / clip.w;
  
  return ndc.xy * 0.5 + 0.5;
} /* End of 'GetUV' function */

/* Get world position from UV coordinates fucntion.
 * ARGUMENTS:
 *   - screen coordinates:
 *       vec2 UV;
 * RETURNS: (vec3) world position.
 */
vec3 GetPosFromUV( vec2 UV ) 
{
  float z = GetDepth(UV);
  vec4 clip = vec4(UV.x / FrameW, UV.y / FrameH, z, 1.0);
  vec4 view = inverse(MatrVP) * clip;
  
  return view.xyz / view.z;
  //return clip.xyz;
} /* End of 'GetPosFromUV' function */

/* Binary search reflection fucntion.
 * ARGUMENTS:
 * RETURNS: (vec2) binary searched uv.
 */
vec2 BinarySearch( vec3 Dir, vec2 StartUV, vec3 StartPoint, float Step )
{
  vec3 HitPoint = StartPoint, NewPoint;
  vec2 uv = StartUV, NewUV;
  float NewDepth;

  for (int i = 0; i < BinarySteps; i++)
  {
    Step *= 0.5;  
    NewPoint = HitPoint + Dir * Step;
    NewUV = GetUV(NewPoint);
    if (any(lessThan(NewUV, vec2(0))) || any(greaterThan(NewUV, vec2(1))))
      return vec2(-1);
    NewDepth = GetDepth(NewUV);
    if (NewPoint.z > NewDepth)
    {
      HitPoint = NewPoint;
      uv = NewUV;
    }
  }
  return uv;
} /* End of 'BinarySearch' funciton */

/* Ray marching fucntion.
 * ARGUMENTS:
 *   - current position:
 *       vec3 Pos; 
 *   - directional vector:
 *       vec3 Dir;
 * RETURNS: (vec2) vertex uv after ray marching.
 */
vec2 RayMarch( vec3 Pos, vec3 Dir )
{
  vec3 CurrentPos = Pos;
  vec2 uv;
  float SceneDepth, RayZ, delta;
   
  for (int i = 0; i < MaxSteps; i++)
  {
    CurrentPos += Dir * RayStep;
    if (length(CurrentPos - Pos) > SearchDist)
      return vec2(-1);
    uv = GetUV(CurrentPos);
    if (any(lessThan(uv, vec2(0))) || any(greaterThan(uv, vec2(1))))
      return vec2(-1);
    SceneDepth = GetDepth(uv);
    RayZ = CurrentPos.z;
    if (RayZ > SceneDepth)
    {
      delta = RayZ - SceneDepth;
      if (delta < MinRayStep)
        return BinarySearch(Dir, uv, CurrentPos, RayStep);
    }
  }
  return vec2(-1);
} /* End of 'RayMarch' fucntion */

/* The main shader function */
void main( void )
{
  vec2 uv = gl_FragCoord.xy;
  
  vec3 viewPos = GetPosFromUV(uv);
  vec3 viewDir = normalize(-viewPos);
  vec4 normal = GetNormal(uv);
  /*
  if ((int(normal.a) & TTV_OUT_REFLECT_BIT) == 0)
    discard;
  */
  vec3 reflectedDir = reflect(viewDir, normal.xyz);

  vec2 hitUV = RayMarch(viewPos, reflectedDir);
  vec3 reflectedColor = GetColor(hitUV); 
  vec3 finalColor = reflectedColor;

  gl_FragDepth = GetDepth(hitUV);
  OutColor = vec4(finalColor, 1);
  //OutColor = vec4(1);
} /* End of 'main' function */

/* END OF 'frag.glsl' FILE */
```

```
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 10.06.2026.
 * NOTE        : Optimized and fixed.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

#version 300 es
precision highp float;

layout(location = 0) out vec4 OutColor;

// Входные текстуры G-буфера
uniform sampler2D ColorTex;
uniform sampler2D NormalTex;
uniform sampler2D DepthTex;

// Матрицы и параметры экрана
uniform mat4 MatrP;
uniform float FrameW;
uniform float FrameH;
uniform bool IsDebug;

/* Настройки трассировки */
float RayStep = 0.04;       // Базовый шаг луча во View Space
int MaxSteps = 150;         // Количество шагов (уменьшено для оптимизации FPS)
int BinarySteps = 6;       // Шаги уточнения пересечения
float SearchDist = 50.0;    // Максимальная дистанция луча
float ObjectThickness = 0.4; // Предполагаемая толщина объектов в метрах

/* Get normal from normal texture function */
vec4 GetNormal( vec2 UV )
{
  return texture(NormalTex, UV);
}

/* Get depth from depth texture function */
float GetDepth( vec2 UV )
{
  return texture(DepthTex, UV).r;
}

/* Get color from color texture function */
vec3 GetColor( vec2 UV )
{
  return texture(ColorTex, UV).rgb;
}

/* Get UV from View Space position */
vec2 GetUV( vec3 viewPos )
{
  vec4 clip = MatrP * vec4(viewPos, 1.0);
  vec3 ndc = clip.xyz / clip.w;
  return ndc.xy * 0.5 + 0.5;
}

/* 
 * ИСПРАВЛЕНО: Восстановление позиции во View Space с использованием 
 * предопределенной инвертированной матрицы проекции (InvP)
 */
vec3 GetPosFromUV( vec2 UV, mat4 InvP ) 
{
  float z = GetDepth(UV);
  // Переводим экранные UV [0,1] и глубинное Z [0,1] в пространство NDC [-1, 1]
  vec4 ndc = vec4(UV * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  
  vec4 view = InvP * ndc;
  return view.xyz / view.w; // Перспективное деление для View Space
}

/* ИСПРАВЛЕНО: Бинарный поиск с корректным сравнением глубин во View Space */
vec2 BinarySearch( vec3 Dir, vec2 StartUV, vec3 StartPoint, mat4 InvP )
{
  vec3 HitPoint = StartPoint;
  vec3 NewPoint;
  vec2 NewUV;

  for (int i = 0; i < BinarySteps; i++)
  {
    RayStep *= 0.5;  
    NewPoint = HitPoint + Dir * RayStep;
    NewUV = GetUV(NewPoint);
    
    if (any(lessThan(NewUV, vec2(0.0))) || any(greaterThan(NewUV, vec2(1.0))))
      return vec2(-1.0);
      
    vec3 scenePos = GetPosFromUV(NewUV, InvP);
    
    // В View Space OpenGL геометрия имеет отрицательный Z (-Z). 
    // Если Z луча меньше (дальше от камеры), чем Z сцены — мы под поверхностью.
    if (NewPoint.z < scenePos.z)
    {
      // Луч глубоко — откатываемся назад к предыдущей удачной точке
      RayStep *= -1.0; 
    }
    HitPoint = NewPoint;
  }
  return GetUV(HitPoint);
}

/* ИСПРАВЛЕНО: Защита от самопересечений и учет толщины объектов */
vec2 RayMarch( vec3 Pos, vec3 Dir, mat4 InvP )
{
  vec3 CurrentPos = Pos;
  vec2 uv;
   
  for (int i = 0; i < MaxSteps; i++)
  {
    // Динамическое масштабирование шага в зависимости от расстояния (экономит FPS вдали)
    float dynamicStep = RayStep * max(1.0, abs(CurrentPos.z) * 0.05);
    CurrentPos += Dir * dynamicStep;
    
    if (length(CurrentPos - Pos) > SearchDist)
      return vec2(-1.0);
      
    uv = GetUV(CurrentPos); 
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))))
      return vec2(-1.0);
      
    vec3 scenePos = GetPosFromUV(uv, InvP);
    
    // Проверка пересечения: координата Z луча ушла ДАЛЬШЕ (вглубь экрана), чем Z сцены
    if (CurrentPos.z < scenePos.z)
    {
      float delta = scenePos.z - CurrentPos.z;
      
      // ИСПРАВЛЕНО: Проверяем толщину объекта, чтобы луч не пересекал "воздух" под коровами
      if (delta > 0.0 && delta < ObjectThickness)
      {
         return BinarySearch(Dir, uv, CurrentPos, InvP);
      }
    }
  }
  return vec2(-1.0);
}

void main( void )
{
  if (IsDebug && gl_FragCoord.x < FrameW / 4.0)
    discard;

  vec2 uv = vec2(gl_FragCoord.x / FrameW, gl_FragCoord.y / FrameH);
  
  // 1. Оптимизация: Считаем инвертированную матрицу ОДИН раз для пикселя, а не внутри циклов
  mat4 MatrInvP = inverse(MatrP);
  
  // 2. Отсечение неба (запрещаем пикселям фона пускать лучи)
  float rawDepth = GetDepth(uv);
  if (rawDepth >= 1.0) {
      OutColor = vec4(0.0);
      return;
  }
  
  vec3 viewPos = GetPosFromUV(uv, MatrInvP);
  vec3 viewDir = normalize(-viewPos);
  vec4 normal = GetNormal(uv);
  
  // 3. ОТСЕЧЕНИЕ САМОПЕРЕСЕЧЕНИЙ КОРОВЫ (Временная маска по цвету)
  // Запрещаем золотым/желтым пикселям коровы генерировать отражения на самих себе
  vec3 baseColor = GetColor(uv);
  if (baseColor.r > 0.5 && baseColor.g > 0.4 && baseColor.b < 0.3) {
      OutColor = vec4(0.0); 
      return;
  }
  
  vec3 reflectedDir = reflect(viewDir, normal.xyz);
  
  // Сдвигаем точку старта луча вперед вдоль нормали (Ray Acne Offset / Bias)
  vec3 biasPos = viewPos + normal.xyz * 0.15; 

  vec2 hitUV = RayMarch(biasPos, reflectedDir, MatrInvP);
  
  // 4. ИСПРАВЛЕНО ПОД GL_ONE, GL_ONE: Шейдер выводит ТОЛЬКО чистый аддитивный цвет отражения
  if (hitUV.x < 0.0) {
      OutColor = vec4(0.0); // Ничего не прибавляем к пикселю
  } else {
      vec3 reflectedColor = GetColor(hitUV); 
      
      // Ослабление Френеля (отражения сильнее на краях под острым углом взгляда)
      float fresnel = pow(clamp(1.0 + dot(viewDir, normal.xyz), 0.0, 1.0), 4.0);
      
      // Виньетка затухания к краям экрана (убирает жесткие срезы уходящих лучей)
      vec2 edgeFactor = smoothstep(vec2(0.0), vec2(0.08), hitUV) * 
                        smoothstep(vec2(0.0), vec2(0.08), 1.0 - hitUV);
      float screenFade = edgeFactor.x * edgeFactor.y;

      // Окончательный результат, который наложится поверх существующего пола
      vec3 ssrFinal = reflectedColor * fresnel * screenFade * 0.8; // 0.8 - общая интенсивность
      
      OutColor = vec4(ssrFinal, 1.0);
  }
}
```

```
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 29.05.2026.
 * NOTE        : None.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

/* 1 ray step size */
float RayStep = 0.01;

/* Max step count */
int MaxSteps = 300;

/* Binary search iterations steps count */
int BinarySteps = 8;

float SearchDist = 50;

mat4 MatrInvP = inverse(MatrP);

/* Get normal from normal texture fucntion.
 * ARGUMENTS:
 *   - uv:
 *     vec2 UV;
 * RETURNS: (vec3) normal.
 */
vec4 GetNormal( vec2 UV )
{
  return normalize(texture(NormalTex, UV));
} /* End of 'GetNormal' function */

/* Get depth from depth texture fucntion.
 * ARGUMENTS:
 *   - uv:
 *     vec2 UV;
 * RETURNS: (float) depth.
 */
float GetDepth( vec2 UV )
{
  return texture(DepthTex, UV).r;
} /* End of 'GetDepth' function */

/* Get color from color texture fucntion.
 * ARGUMENTS:
 *   - uv:
 *     vec2 UV;
 * RETURNS: (vec3) color.
 */
vec3 GetColor( vec2 UV )
{
  return texture(ColorTex, UV).rgb;
} /* End of 'GetColor' function */

/* Get UV from world position fucntion.
 * ARGUMENTS:
 *   - world position:
 *       vec3 Pos;
 * RETURNS: (vec2) UV.
 */
vec2 GetUV( vec3 Pos )
{
  vec4 clip = MatrP * vec4(Pos, 1.0);
  vec3 ndc = clip.xyz / clip.w;
  
  return ndc.xy * 0.5 + 0.5;
} /* End of 'GetUV' function */

/* Get world position from UV coordinates fucntion.
 * ARGUMENTS:
 *   - screen coordinates:
 *       vec2 UV;
 * RETURNS: (vec3) world position.
 */
vec3 GetPosFromUV( vec2 UV ) 
{
  float z = GetDepth(UV);
  vec4 clip = vec4(UV * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  vec4 view = MatrInvP * clip;
  
  return view.xyz / view.z;
  //return (clip * inverse(MatrVP)).xyz;
} /* End of 'GetPosFromUV' function */

/* Binary search reflection fucntion.
 * ARGUMENTS:
 * RETURNS: (vec2) binary searched uv.
 */
vec2 BinarySearch( vec3 Dir, vec2 StartUV, vec3 StartPoint )
{
  vec3 HitPoint = StartPoint, NewPoint;
  vec2 uv = StartUV, NewUV;

  for (int i = 0; i < BinarySteps; i++)
  {
    RayStep *= 0.5;  
    NewPoint = HitPoint + Dir * RayStep;
    NewUV = GetUV(NewPoint);
    if (any(lessThan(NewUV, vec2(0))) || any(greaterThan(NewUV, vec2(1))))
      return vec2(-1);
    vec3 ScenePos = GetPosFromUV(NewUV);
    if (NewPoint.z < ScenePos.z)
    {
      HitPoint = NewPoint;
      uv = NewUV;
    }
  }
  return uv;
} /* End of 'BinarySearch' funciton */

/* Ray marching fucntion.
 * ARGUMENTS:
 *   - current position:
 *       vec3 Pos; 
 *   - directional vector:
 *       vec3 Dir;
 * RETURNS: (vec2) vertex uv after ray marching.
 */
/*
vec2 RayMarch( vec3 Pos, vec3 Dir )
{
  vec3 CurrentPos = Pos;
  vec2 uv;
  
  for (int i = 0; i < MaxSteps; i++)
  {
    CurrentPos += Dir * RayStep;
    if (length(CurrentPos - Pos) > SearchDist)
      return vec2(-1);

    uv = GetUV(CurrentPos); 
    if (any(lessThan(uv, vec2(0))) || any(greaterThan(uv, vec2(1))))
      return vec2(-1);

    vec3 sceneViewPos = GetPosFromUV(uv); 
    
    if (CurrentPos.z < sceneViewPos.z)
    {
      float delta = sceneViewPos.z - CurrentPos.z;
      if (delta < 0.5)
        return BinarySearch(Dir, uv, CurrentPos);
    }
  }
  return vec2(-1);
} /* End of 'RayMarch' fucntion */

vec2 RayMarch( vec3 Pos, vec3 Dir )
{
  vec3 CurrentPos = Pos;
  float Step = 0.05; 
  
  for (int i = 0; i < 50; i++)
  {
    CurrentPos += Dir * Step;
    vec2 uv = GetUV(CurrentPos); 
    
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec2(-1);
    
    vec3 scenePos = GetPosFromUV(uv);
    
    if (CurrentPos.z < scenePos.z)
    {
       float distFromStart = length(CurrentPos - Pos);
       if (distFromStart < 0.1) 
       {
           continue;
       }

       float delta = scenePos.z - CurrentPos.z;
       if (delta < 0.5)
           return BinarySearch(Dir, uv, CurrentPos);
    }
  }
  return vec2(-1);
}


/* The main shader function */
void main( void )
{
  if (IsDebug && gl_FragCoord.x < FrameW / 4)
    discard;

  vec2 uv = vec2(gl_FragCoord.x / FrameW, gl_FragCoord.y / FrameH);
  
  /*
  if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1)
    discard;
  */
  vec3 viewPos = GetPosFromUV(uv);
  vec3 viewDir = normalize(-viewPos);
  vec4 normal = GetNormal(uv);

  if (normal.w < 0.01) {
    OutColor = vec4(0.0);
    return;
  }
  
  vec3 reflectedDir = reflect(viewDir, normal.xyz);

  vec3 biasPos = viewPos + normal.xyz * 0.05; 

  vec2 hitUV = RayMarch(biasPos, reflectedDir); 

  //vec2 hitUV = RayMarch(viewPos, reflectedDir);
  /*
  if (hitUV == vec2(-1))
  {
    OutColor = vec4(1, 0, 0, 1); 
    return;
  }
  else
  {
    OutColor = vec4(0, 1, 0, 1); 
    return;
  }
  */
  vec3 reflectedColor;
  if (hitUV.x < 0.0f) {
      reflectedColor = vec3(0.0f); // Если не попали — нет отражения
  } else {
      reflectedColor = GetColor(hitUV);
      
      // Затухание у краев экрана, чтобы не было резких срезов отражения
      vec2 edgeFactor = smoothstep(vec2(0.0f), vec2(0.1f), hitUV) * 
                        smoothstep(vec2(0.0f), vec2(0.1f), 1.0f - hitUV);
      float screenFade = edgeFactor.x * edgeFactor.y;
      
      reflectedColor *= screenFade;
  }//vec3 reflectedColor = GetColor(hitUV); 

  float fresnel = pow(1 + dot(viewDir, normal.xyz), 2);
  vec4 finalColor = mix(vec4(GetColor(uv), 1), vec4(reflectedColor, 1), fresnel);
  //vec3 finalColor = reflectedColor;
  //gl_FragDepth = GetDepth(hitUV);
  OutColor = vec4(finalColor.xyz, 1);
  //OutColor = vec4(1);
} /* End of 'main' function */

/* END OF 'frag.glsl' FILE */
```

```
/*************************************************************
 * Copyright (C) 2026
 *    Computer Graphics Support Group of 30 Phys-Math Lyceum
 *************************************************************/

/* FILE NAME   : geom.glsl
 * PURPOSE     : Tough Traffic Vegetation project.
 *               Screen space effects shaders.
 *               SS reflection shaders.
 *               Fragment shader.
 * PROGRAMMER  : CGSG'Jr'2025.
 *               Atyukov Aleksandr (AA3).
 * LAST UPDATE : 10.06.2026.
 * NOTE        : Optimized and fixed.
 *
 * No part of this file may be changed without agreement of
 * Computer Graphics Support Group of 30 Phys-Math Lyceum
 */

float RayStep = 0.12;       // Увеличено, чтобы луч улетал дальше
int MaxSteps = 100;         // 100 шагов хватит для красивого шлейфа
int BinarySteps = 6;       // Шаги уточнения пересечения
float SearchDist = 50.0;    // Максимальная дистанция луча
float ObjectThickness = 1.5;

/* Get normal from normal texture function */
vec4 GetNormal( vec2 UV )
{
  return texture(NormalTex, UV);
}

/* Get depth from depth texture function */
float GetDepth( vec2 UV )
{
  return texture(DepthTex, UV).r;
}

/* Get color from color texture function */
vec3 GetColor( vec2 UV )
{
  return texture(ColorTex, UV).rgb;
}

/* Get UV from View Space position */
vec2 GetUV( vec3 viewPos )
{
  vec4 clip = MatrP * vec4(viewPos, 1.0);
  vec3 ndc = clip.xyz / clip.w;
  return ndc.xy * 0.5 + 0.5;
}

/* 
 * ИСПРАВЛЕНО: Восстановление позиции во View Space с использованием 
 * предопределенной инвертированной матрицы проекции (InvP)
 */
vec3 GetPosFromUV( vec2 UV, mat4 InvP ) 
{
  float z = GetDepth(UV);
  // Переводим экранные UV [0,1] и глубинное Z [0,1] в пространство NDC [-1, 1]
  vec4 ndc = vec4(UV * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  
  vec4 view = InvP * ndc;
  return view.xyz / view.w; // Перспективное деление для View Space
}

/* ИСПРАВЛЕНО: Бинарный поиск с корректным сравнением глубин во View Space */
vec2 BinarySearch( vec3 Dir, vec2 StartUV, vec3 StartPoint, mat4 InvP )
{
  vec3 HitPoint = StartPoint;
  vec3 NewPoint;
  vec2 NewUV;

  for (int i = 0; i < BinarySteps; i++)
  {
    RayStep *= 0.5;  
    NewPoint = HitPoint + Dir * RayStep;
    NewUV = GetUV(NewPoint);
    
    if (any(lessThan(NewUV, vec2(0.0))) || any(greaterThan(NewUV, vec2(1.0))))
      return vec2(-1.0);
      
    vec3 scenePos = GetPosFromUV(NewUV, InvP);
    
    // В View Space OpenGL геометрия имеет отрицательный Z (-Z). 
    // Если Z луча меньше (дальше от камеры), чем Z сцены — мы под поверхностью.
    if (NewPoint.z < scenePos.z)
    {
      // Луч глубоко — откатываемся назад к предыдущей удачной точке
      RayStep *= -1.0; 
    }
    HitPoint = NewPoint;
  }
  return GetUV(HitPoint);
}

/* ИСПРАВЛЕНО: Защита от самопересечений и учет толщины объектов */
vec2 RayMarch( vec3 Pos, vec3 Dir, mat4 InvP )
{
  vec3 CurrentPos = Pos;
  vec2 uv;
   
  for (int i = 0; i < MaxSteps; i++)
  {
    // Динамическое масштабирование шага в зависимости от расстояния (экономит FPS вдали)
    float dynamicStep = RayStep * max(1.0, abs(CurrentPos.z) * 0.05);
    CurrentPos += Dir * dynamicStep;
    
    if (length(CurrentPos - Pos) > SearchDist)
      return vec2(-1.0);
      
    uv = GetUV(CurrentPos); 
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))))
      return vec2(-1.0);
      
    vec3 scenePos = GetPosFromUV(uv, InvP);
    
    // Проверка пересечения: координата Z луча ушла ДАЛЬШЕ (вглубь экрана), чем Z сцены
    if (CurrentPos.z < scenePos.z)
    {
      float delta = scenePos.z - CurrentPos.z;
      
      if (delta > 0.0 && delta < ObjectThickness)
      {
         float hitRawDepth = GetDepth(uv);
         
         if (hitRawDepth >= 0.999) 
             continue; 

         return BinarySearch(Dir, uv, CurrentPos, InvP);
      }
    }
  }
  return vec2(-1.0);
}

void main( void )
{
  if (IsDebug && gl_FragCoord.x < FrameW / 4.0)
    discard;

  vec2 uv = vec2(gl_FragCoord.x / FrameW, gl_FragCoord.y / FrameH);
  
  // 1. Оптимизация: Считаем инвертированную матрицу ОДИН раз для пикселя, а не внутри циклов
  mat4 MatrInvP = inverse(MatrP);
  
  // 2. Отсечение неба (запрещаем пикселям фона пускать лучи)
  float rawDepth = GetDepth(uv);
  if (rawDepth >= 1.0) {
      OutColor = vec4(0.0);
      return;
  }
  
  vec3 viewPos = GetPosFromUV(uv, MatrInvP);
  vec3 viewDir = normalize(viewPos);
  vec4 normal = GetNormal(uv);
  
  // 3. ОТСЕЧЕНИЕ САМОПЕРЕСЕЧЕНИЙ КОРОВЫ (Временная маска по цвету)
  // Запрещаем золотым/желтым пикселям коровы генерировать отражения на самих себе
  vec3 baseColor = GetColor(uv);
/*
  if (baseColor.r > 0.5 && baseColor.g > 0.4 && baseColor.b < 0.3) {
      OutColor = vec4(0.0); 
      return;
  }
*/  
  vec3 reflectedDir = reflect(viewDir, normal.xyz);
  
  // Сдвигаем точку старта луча вперед вдоль нормали (Ray Acne Offset / Bias)
  vec3 biasPos = viewPos + normal.xyz * 0.15; 

  vec2 hitUV = RayMarch(biasPos, reflectedDir, MatrInvP);
  
  // 4. ИСПРАВЛЕНО ПОД GL_ONE, GL_ONE: Шейдер выводит ТОЛЬКО чистый аддитивный цвет отражения
  if (hitUV.x < 0.0) {
      OutColor = vec4(0.0); // Ничего не прибавляем к пикселю
  } else {
      vec3 reflectedColor = GetColor(hitUV); 
      
      // Ослабление Френеля (отражения сильнее на краях под острым углом взгляда)
      float fresnel = pow(clamp(1.0 + dot(viewDir, normal.xyz), 0.0, 1.0), 4.0);
      
      // Виньетка затухания к краям экрана (убирает жесткие срезы уходящих лучей)
      vec2 edgeFactor = smoothstep(vec2(0.0), vec2(0.08), hitUV) * 
                        smoothstep(vec2(0.0), vec2(0.08), 1.0 - hitUV);
      float screenFade = edgeFactor.x * edgeFactor.y;

      // Окончательный результат, который наложится поверх существующего пола
      vec3 ssrFinal = reflectedColor * fresnel /* screenFade*/ * 0.8; // 0.8 - общая интенсивность
      
      OutColor = vec4(ssrFinal, 1.0);
  }
} /* End of 'main' function */

/* END OF 'frag.glsl' FILE */
```