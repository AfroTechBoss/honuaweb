-- 050: remove invented numbers and demo listings left by the early seeds.
--
-- 001 seeded communities and challenges with made-up member/participant
-- counts (12,400 urban gardeners, 38,200 plastic-free participants, ...).
-- The triggers in 001 only add/subtract from those starting values, so every
-- count shown in the app has been off by the fake seed ever since.
--
-- 014 seeded seven catalogue products with no seller and fake ratings
-- (4.7-4.9 stars from 134-214 "reviews" that don't exist). Nobody can fulfil
-- an order for them.
--
-- Safe to re-run.

-- Communities and challenges stay (they're real, joinable spaces), but their
-- counts become the actual number of rows.
update communities c
   set member_count = (select count(*) from community_members m where m.community_id = c.id);

update challenges ch
   set participant_count = (select count(*) from challenge_participants p where p.challenge_id = ch.id);

-- Seeded products: hide rather than delete, so any order_items history that
-- references them keeps its product row. 'removed' is the admin take-down
-- status and is excluded from the marketplace by the select policy.
update products
   set status = 'removed', featured = false
 where seller_id is null
   and name in (
     'Refillable shampoo bar', 'Solar phone charger', 'Bamboo cutlery set',
     'Reusable produce bags', 'Wool insulation panel', 'Compost starter kit',
     'The repair kit'
   );

-- Ratings come only from real reviews: recompute every product.
update products p
   set review_count = r.n,
       rating       = r.avg
  from (
    select pr.id,
           (select count(*) from product_reviews x where x.product_id = pr.id)::int as n,
           coalesce((select round(avg(stars)::numeric, 1) from product_reviews x where x.product_id = pr.id), 0) as avg
      from products pr
  ) r
 where r.id = p.id
   and (p.review_count is distinct from r.n or p.rating is distinct from r.avg);
